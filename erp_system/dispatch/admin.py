from django.contrib import admin
from .models import DispatchHistory

@admin.register(DispatchHistory)
class DispatchHistoryAdmin(admin.ModelAdmin):
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
