from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import ProductionReport
from .serializers import (
    ProductionReportSerializer,
    ProductionReportListSerializer,
    ProductionReportHistorySerializer,
)

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

class ProductionReportPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 1000


class ProductionReportViewSet(viewsets.ModelViewSet):
    # Ensure we don't return production reports for soft-deleted or dispatched customer orders
    def get_queryset(self):
        return ProductionReport.objects.filter(
            customer_order__is_deleted=False
        ).exclude(
            Q(customer_order__status='DISPATCHED') |
            Q(customer_order__status='CLOSED') |
            Q(customer_order__is_short_closed=True)
        ).select_related('customer_order', 'created_by', 'last_edited_by')

    serializer_class = ProductionReportSerializer
    permission_classes = [IsAdminOrStockManagerForWrite]
    pagination_class = ProductionReportPagination
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return ProductionReportListSerializer
        return ProductionReportSerializer

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
        old_produced_qty = serializer.instance.produced_quantity or 0
        
        report = serializer.save(last_edited_by=self.request.user)
        new_produced_qty = report.produced_quantity or 0
        customer_order = report.customer_order
        
        # Determine if this was the final transition to COMPLETED (full production)
        if old_status != ProductionReport.STATUS_COMPLETED and report.status == ProductionReport.STATUS_COMPLETED:
            # Full production completed - move to READY_FOR_DISPATCH
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
                    
                    # Deduce produced + scrap from total_blanks
                    # Add produced to finished_blanks
                    total_consumed = qty + (report.scrap_quantity or 0)
                    
                    try:
                        inv.decrease_blanks(total_consumed, user=self.request.user, change_type=InventoryLog.PRODUCTION_USED, reason=reason)
                        inv.increase_finished(qty, user=self.request.user, change_type=InventoryLog.PRODUCTION_CREATED, reason=reason)
                    except DjangoValidationError as e:
                        # Translate Django model validation to DRF 400 Bad Request natively
                        raise DRFValidationError({"inventory_error": list(e.messages) if hasattr(e, 'messages') else str(e)})

            except Inventory.DoesNotExist:
                raise DRFValidationError({"inventory_error": "No matching inventory record found for this part to deduct blanks from."})
        
        elif old_produced_qty != new_produced_qty:
            # Partial production update - update inventory incrementally
            from inventory.models import Inventory, InventoryLog
            from rest_framework.exceptions import ValidationError as DRFValidationError
            from django.core.exceptions import ValidationError as DjangoValidationError
            from django.db import transaction
            
            if new_produced_qty > 0:
                qty_delta = new_produced_qty - old_produced_qty  # Difference in produced qty
                
                try:
                    with transaction.atomic():
                        # Get or create inventory record for this company/part
                        inv, created = Inventory.objects.get_or_create(
                            company=customer_order.company,
                            part=customer_order.part,
                            defaults={'total_blanks': 0, 'finished_blanks': 0}
                        )
                        
                        reason = f"Partial Production for PO: {customer_order.po_number} (Produced: {new_produced_qty}/{report.required_quantity})"
                        
                        # For partial production, just track finished goods
                        # Blanks will be deducted when production is marked COMPLETED
                        if qty_delta > 0:
                            try:
                                inv.increase_finished(qty_delta, user=self.request.user, change_type=InventoryLog.PRODUCTION_CREATED, reason=reason)
                            except DjangoValidationError as e:
                                raise DRFValidationError({"inventory_error": list(e.messages) if hasattr(e, 'messages') else str(e)})
                
                except Exception as e:
                    raise DRFValidationError({"inventory_error": str(e)})

    def update(self, request, *args, **kwargs):
        """Override update to return custom response with warning if production is incomplete"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if this will be a partial production
        produced_qty_raw = request.data.get('produced_quantity', instance.produced_quantity)
        required_qty = instance.required_quantity
        
        try:
            incoming_qty = int(produced_qty_raw) if produced_qty_raw not in [None, ''] else 0
            produced_qty = (instance.produced_quantity or 0) + incoming_qty
        except (TypeError, ValueError):
            produced_qty = instance.produced_quantity or 0
        
        response = super().update(request, *args, **kwargs)
        
        # Add warning message if production is incomplete
        if produced_qty and produced_qty < required_qty:
            warning_msg = f"⚠️ Warning: Produced {produced_qty} but required quantity is {required_qty}. Remaining: {required_qty - produced_qty} units. Status kept as IN_PROGRESS."
            response.data['warning'] = warning_msg
        
        return response

    @action(detail=False, methods=['get'], url_path='history')
    def history_list(self, request):
        """
        Full production report history (including completed/dispatched orders).
        """
        queryset = ProductionReport.objects.select_related(
            'customer_order',
            'customer_order__company',
            'customer_order__client',
            'customer_order__part',
            'created_by',
            'last_edited_by',
        ).order_by('-created_at')

        po_number = request.query_params.get('po_number')
        status_filter = request.query_params.get('status')
        machine_name = request.query_params.get('machine_name')

        if po_number:
            queryset = queryset.filter(customer_order__po_number__icontains=po_number)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if machine_name:
            queryset = queryset.filter(machine_name__icontains=machine_name)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductionReportHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ProductionReportHistorySerializer(queryset, many=True)
        return Response(serializer.data)
