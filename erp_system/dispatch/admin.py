from django.contrib import admin
from .models import DispatchHistory, DispatchOrder

@admin.register(DispatchHistory)
class DispatchHistoryAdmin(admin.ModelAdmin):
    list_per_page = 25
    list_display = (
        "po_number",
        "client_name",
        "company_name",
        "part_name",
        "shipped_quantity",
        "is_short_closed",
        "dispatched_at",
        "dispatched_by",
    )
    list_filter = ("company_name", "client_name", "is_short_closed", "dispatched_at")
    search_fields = ("po_number", "client_name", "part_name")
    readonly_fields = ("dispatched_at",)

@admin.register(DispatchOrder)
class DispatchOrderAdmin(admin.ModelAdmin):
    list_display = ("po_number", "company", "client", "part", "quantity", "status", "deadline")
    list_filter = ("company", "client", "priority")
    search_fields = ("po_number", "client__name", "part__name")
    
    def get_queryset(self, request):
        return super().get_queryset(request).filter(
            status__in=["READY_FOR_DISPATCH", "PARTIALLY_SHIPPED"]
        )

    def has_add_permission(self, request):
        return False
