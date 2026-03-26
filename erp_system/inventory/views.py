from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Inventory, InventoryLog
from .serializers import InventorySerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from django.utils.encoding import force_str
from django.core.exceptions import ValidationError
from django.db.models import OuterRef, Subquery, DateTimeField, CharField
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

        return (
            Inventory.objects.filter(is_active=True)
            .annotate(last_adjusted_at=last_adjusted_at, last_adjusted_by=last_adjusted_by)
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

    queryset = (
        Inventory.objects.filter(is_active=True)
        .annotate(last_adjusted_at=_last_adjusted_at, last_adjusted_by=_last_adjusted_by)
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
            inventory = Inventory.objects.get(pk=pk, is_active=True)
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
            Inventory.objects.filter(pk=pk, is_active=True)
            .annotate(last_adjusted_at=last_adjusted_at, last_adjusted_by=last_adjusted_by)
            .select_related("company", "part")
            .first()
        )

        if not annotated:
            return Response({"detail": "Inventory not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = InventorySerializer(annotated, context={"request": request})
        return Response(serializer.data)
