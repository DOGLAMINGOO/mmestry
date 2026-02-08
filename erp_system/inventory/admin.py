from django.contrib import admin
from .models import Inventory

# Register your models here.
class InventoryAdmin(admin.ModelAdmin):
    list_display=(
    'company',
    'part',
    'blanks_qty',
    'finished_qty',
    'reserved_qty',
    'created_at',
    'updated_at'
    )
    readonly_fields=("created_at", "updated_at")


admin.site.register(Inventory, InventoryAdmin)
