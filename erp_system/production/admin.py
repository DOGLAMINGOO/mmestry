from django.contrib import admin
from .models import ProductionReport, ProductionOrder

@admin.register(ProductionReport)
class ProductionReportAdmin(admin.ModelAdmin):
    list_display = (
        "customer_order",
        "machine_name",
        "operator_name",
        "status",
        "required_quantity",
        "produced_quantity",
        "scrap_quantity",
        "deadline",
    )
    list_filter = ("status", "machine_name", "operator_name", "deadline")
    search_fields = ("customer_order__po_number", "machine_name", "operator_name")
    readonly_fields = ("created_at", "updated_at")

@admin.register(ProductionOrder)
class ProductionOrderAdmin(admin.ModelAdmin):
    list_display = ("po_number", "company", "client", "part", "quantity", "status", "deadline")
    list_filter = ("company", "client", "priority")
    search_fields = ("po_number", "client__name", "part__name")
    
    def get_queryset(self, request):
        return super().get_queryset(request).filter(
            status__in=["APPROVED", "IN_PRODUCTION"]
        )

    def has_add_permission(self, request):
        return False
