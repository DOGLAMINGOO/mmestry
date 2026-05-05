from django.contrib import admin
from .models import ProductionReport

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
