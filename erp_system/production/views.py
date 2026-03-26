from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import ProductionReport
from .serializers import ProductionReportSerializer

class IsAdminOrStockManagerForWrite(permissions.BasePermission):
    """
    Custom permission:
    - Anyone authenticated can read (GET, HEAD, OPTIONS).
    - Only Admins and Stock Managers can write (POST, PUT, PATCH, DELETE).
    """
    def has_permission(self, request, view):
        # Authenticated users can broadly access the endpoint
        if not request.user.is_authenticated:
            return False

        # If it's a safe method (GET), let them through
        if request.method in permissions.SAFE_METHODS:
            return True

        # Otherwise, check write permissions
        return request.user.role in ['ADMIN', 'STOCK_MANAGER']

class ProductionReportViewSet(viewsets.ModelViewSet):
    # Ensure we don't return production reports for soft-deleted customer orders
    queryset = ProductionReport.objects.filter(customer_order__is_deleted=False).select_related('customer_order', 'created_by', 'last_edited_by')
    serializer_class = ProductionReportSerializer
    permission_classes = [IsAdminOrStockManagerForWrite]

    def perform_create(self, serializer):
        # Enforce write permissions at the view level as a safety net
        if self.request.user.role not in ['ADMIN', 'STOCK_MANAGER']:
            raise PermissionDenied("Only Admins and Stock Managers can create production reports.")
        
        report = serializer.save(created_by=self.request.user)
        
        # When a report is created, update the underlying Customer Order status 
        customer_order = report.customer_order
        customer_order.status = 'IN_PRODUCTION'
        customer_order.save()

    def perform_update(self, serializer):
        if self.request.user.role not in ['ADMIN', 'STOCK_MANAGER']:
            raise PermissionDenied("Only Admins and Stock Managers can edit production reports.")
        
        # Track old status to only trigger inventory sync once upon completion
        old_status = ProductionReport.objects.get(pk=serializer.instance.pk).status
        
        report = serializer.save(last_edited_by=self.request.user)
        
        # Determine if this was the final transition to COMPLETED
        if old_status != ProductionReport.STATUS_COMPLETED and report.status == ProductionReport.STATUS_COMPLETED:
            customer_order = report.customer_order
            customer_order.status = 'READY_FOR_DISPATCH'
            customer_order.save()
            
            # --- Synchronize Inventory ---
            from inventory.models import Inventory, InventoryLog
            from rest_framework.exceptions import ValidationError as DRFValidationError
            from django.core.exceptions import ValidationError as DjangoValidationError
            from django.db import transaction
            
            try:
                with transaction.atomic():
                    inv = Inventory.objects.select_for_update().get(company=customer_order.company, part=customer_order.part)
                    qty = report.produced_quantity
                    
                    if not qty or qty <= 0:
                        raise DRFValidationError({"produced_quantity": "Cannot complete report with 0 produced quantity."})
                    
                    # Log reasons for clarity in auditing
                    reason = f"Production Report #{report.id} completed for PO: {customer_order.po_number}"
                    
                    # These models raise DjangoValidationError if negative stock occurs
                    try:
                        inv.decrease_blanks(qty, user=self.request.user, change_type=InventoryLog.PRODUCTION_USED, reason=reason)
                        inv.increase_finished(qty, user=self.request.user, change_type=InventoryLog.PRODUCTION_CREATED, reason=reason)
                    except DjangoValidationError as e:
                        # Translate Django model validation to DRF 400 Bad Request natively
                        raise DRFValidationError({"inventory_error": list(e.messages) if hasattr(e, 'messages') else str(e)})

            except Inventory.DoesNotExist:
                raise DRFValidationError({"inventory_error": "No matching inventory record found for this part to deduct blanks from."})
