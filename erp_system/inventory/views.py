from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Inventory, InventoryLog, StockReceipt
from .serializers import InventorySerializer, StockReceiptSerializer, InventoryLogSerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from django.utils.encoding import force_str
from django.core.exceptions import ValidationError
from django.db.models import OuterRef, Subquery, DateTimeField, CharField, Sum, IntegerField, Value
from django.db.models.functions import Coalesce
from django.http import StreamingHttpResponse
from io import StringIO
import csv
from customer_order.models import CustomerOrder
from .permissions import CanAdjustInventory


class HistoryPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 1000


class InventoryLogListView(generics.ListAPIView):
    serializer_class = InventoryLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = HistoryPagination

    def get_queryset(self):
        queryset = InventoryLog.objects.select_related(
            "inventory",
            "inventory__company",
            "inventory__part",
            "created_by",
        ).order_by("-created_at")

        change_type = self.request.query_params.get("change_type")
        company = self.request.query_params.get("company")
        part = self.request.query_params.get("part")

        if change_type:
            queryset = queryset.filter(change_type=change_type)
        if company:
            queryset = queryset.filter(inventory__company__name__icontains=company)
        if part:
            queryset = queryset.filter(inventory__part__name__icontains=part)

        return queryset


class StockReceiptListCreateView(generics.ListCreateAPIView):
    queryset = StockReceipt.objects.select_related("company", "part", "received_by").order_by("-received_at")
    serializer_class = StockReceiptSerializer
    pagination_class = HistoryPagination

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanAdjustInventory()]

    def perform_create(self, serializer):
        user = self.request.user
        receipt = serializer.save(received_by=user)

        company = receipt.company
        part = receipt.part
        qty = receipt.quantity

        inventory, _created = Inventory.objects.get_or_create(
            company=company,
            part=part,
            defaults={"total_blanks": 0, "finished_blanks": 0},
        )

        reason = f"PO Received: {receipt.invoice_number} from {receipt.supplier_name}"
        inventory.increase_blanks(qty, user, change_type=InventoryLog.PO_RECEIVED, reason=reason)


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


class InventoryReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        inventory = InventoryView().get_queryset()
        company_code = request.query_params.get("company")
        if company_code:
            inventory = inventory.filter(company__code=company_code.upper())

        def rows():
            buffer = StringIO()
            writer = csv.writer(buffer)
            writer.writerow([
                "Company",
                "Part Number",
                "Part",
                "Total Blanks",
                "Reserved Blanks",
                "Available Blanks",
                "Finished Parts",
                "Last Adjusted By",
                "Last Adjusted At",
            ])
            yield buffer.getvalue()

            for item in inventory.iterator():
                buffer.seek(0)
                buffer.truncate(0)
                writer.writerow([
                    item.company.name,
                    item.part.part_number,
                    item.part.name,
                    item.total_blanks,
                    item.reserved_blanks_qty or 0,
                    (item.total_blanks or 0) - (item.reserved_blanks_qty or 0),
                    item.finished_blanks,
                    item.last_adjusted_by or "",
                    item.last_adjusted_at.isoformat() if item.last_adjusted_at else "",
                ])
                yield buffer.getvalue()

        response = StreamingHttpResponse(rows(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="inventory-report.csv"'
        return response


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
