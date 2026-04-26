from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Inventory, InventoryLog, StockReceipt
from .serializers import InventorySerializer, StockReceiptSerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from django.utils.encoding import force_str
from django.core.exceptions import ValidationError
from django.db.models import OuterRef, Subquery, DateTimeField, CharField, Sum, IntegerField, Value
from django.db.models.functions import Coalesce
from customer_order.models import CustomerOrder
from .permissions import CanAdjustInventory


class InventoryView(generics.ListAPIView):
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Subquery to fetch the most recent ADJUSTMENT log per Inventory (limit 1)
        last_log_qs = (
            InventoryLog.objects.filter(inventory=OuterRef("pk"), change_type=InventoryLog.ADJUSTMENT)
            .order_by("-created_at")
        )

        last_adjusted_at = Subquery(last_log_qs.values("created_at")[:1], output_field=DateTimeField())
        last_adjusted_by = Subquery(last_log_qs.values("created_by__username")[:1], output_field=CharField())

        reserved_blanks_qs = (
            CustomerOrder.objects.filter(
                company=OuterRef("company"),
                part=OuterRef("part"),
                status__in=[CustomerOrder.STATUS_APPROVED, CustomerOrder.STATUS_IN_PRODUCTION],
                is_deleted=False
            )
            .values("company", "part")
            .annotate(total=Sum("quantity"))
            .values("total")
        )
        reserved_blanks = Coalesce(Subquery(reserved_blanks_qs, output_field=IntegerField()), Value(0))

        return (
            Inventory.objects.all()
            .annotate(
                last_adjusted_at=last_adjusted_at, 
                last_adjusted_by=last_adjusted_by,
                reserved_blanks_qty=reserved_blanks
            )
            .select_related("company", "part")
        )


class InventoryDetailView(generics.RetrieveAPIView):
    # Annotate detail queryset similarly so serializer can use the annotated fields
    _last_log_qs = (
        InventoryLog.objects.filter(inventory=OuterRef("pk"), change_type=InventoryLog.ADJUSTMENT)
        .order_by("-created_at")
    )
    _last_adjusted_at = Subquery(_last_log_qs.values("created_at")[:1], output_field=DateTimeField())
    _last_adjusted_by = Subquery(_last_log_qs.values("created_by__username")[:1], output_field=CharField())

    _reserved_blanks_qs = (
        CustomerOrder.objects.filter(
            company=OuterRef("company"),
            part=OuterRef("part"),
            status__in=[CustomerOrder.STATUS_APPROVED, CustomerOrder.STATUS_IN_PRODUCTION],
            is_deleted=False
        )
        .values("company", "part")
        .annotate(total=Sum("quantity"))
        .values("total")
    )
    _reserved_blanks = Coalesce(Subquery(_reserved_blanks_qs, output_field=IntegerField()), Value(0))

    queryset = (
        Inventory.objects.all()
        .annotate(
            last_adjusted_at=_last_adjusted_at, 
            last_adjusted_by=_last_adjusted_by,
            reserved_blanks_qty=_reserved_blanks
        )
        .select_related("company", "part")
    )
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

class InventoryDestroyView(generics.DestroyAPIView):
    queryset = Inventory.objects.all()
    # Only ADMIN and STOCK_MANAGER (via CanAdjustInventory) may delete inventory
    permission_classes = [IsAuthenticated, CanAdjustInventory]

    def destroy(self, request, *args, **kwargs):
        # Hard delete: permanently remove the inventory row
        return super().destroy(request, *args, **kwargs)


class InventoryAdjustView(APIView):
    permission_classes = [IsAuthenticated, CanAdjustInventory]

    def post(self, request, pk):
        user = request.user

        data = request.data
        action = data.get("action")  # 'increase' or 'decrease'
        field = data.get("field")  # 'blanks'|'finished'
        qty = data.get("quantity")
        reason = data.get("reason")

        if not reason:
            return Response({"reason": ["Reason is required for adjustments"]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            qty = int(qty)
        except Exception:
            return Response({"quantity": ["A positive integer quantity is required"]}, status=status.HTTP_400_BAD_REQUEST)

        if qty <= 0:
            return Response({"quantity": ["Quantity must be positive"]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            inventory = Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return Response({"detail": "Inventory not found"}, status=status.HTTP_404_NOT_FOUND)

        change_type = InventoryLog.ADJUSTMENT

        try:
            if field == "blanks":
                if action == "increase":
                    inventory.increase_blanks(qty, user, change_type, reason=reason)
                else:
                    inventory.decrease_blanks(qty, user, change_type, reason=reason)
            elif field == "finished":
                if action == "increase":
                    inventory.increase_finished(qty, user, change_type, reason=reason)
                else:
                    inventory.decrease_finished(qty, user, change_type, reason=reason)
            else:
                return Response({"field": ["Invalid field"]}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({"detail": e.message_dict if hasattr(e, 'message_dict') else e.messages}, status=status.HTTP_400_BAD_REQUEST)
        # Re-fetch the inventory annotated with the latest ADJUSTMENT log
        last_log_qs = (
            InventoryLog.objects.filter(inventory=OuterRef("pk"), change_type=InventoryLog.ADJUSTMENT)
            .order_by("-created_at")
        )

        last_adjusted_at = Subquery(last_log_qs.values("created_at")[:1], output_field=DateTimeField())
        last_adjusted_by = Subquery(last_log_qs.values("created_by__username")[:1], output_field=CharField())

        annotated = (
            Inventory.objects.filter(pk=pk)
            .annotate(last_adjusted_at=last_adjusted_at, last_adjusted_by=last_adjusted_by)
            .select_related("company", "part")
            .first()
        )

        if not annotated:
            return Response({"detail": "Inventory not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = InventorySerializer(annotated, context={"request": request})
        return Response(serializer.data)


class StockReceiptCreateView(generics.CreateAPIView):
    queryset = StockReceipt.objects.all()
    serializer_class = StockReceiptSerializer
    permission_classes = [IsAuthenticated, CanAdjustInventory]

    def perform_create(self, serializer):
        user = self.request.user
        # Save the receipt first
        receipt = serializer.save(received_by=user)
        
        # Now update inventory
        company = receipt.company
        part = receipt.part
        qty = receipt.quantity
        
        # get_or_create inventory if it doesn't exist
        inventory, created = Inventory.objects.get_or_create(
            company=company,
            part=part,
            defaults={'total_blanks': 0, 'finished_blanks': 0}
        )
        
        # Increase blanks and log the transaction
        reason = f"PO Received: {receipt.invoice_number} from {receipt.supplier_name}"
        inventory.increase_blanks(qty, user, change_type=InventoryLog.PO_RECEIVED, reason=reason)
