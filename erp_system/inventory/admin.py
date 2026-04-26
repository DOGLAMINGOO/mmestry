from django.contrib import admin
from .models import Inventory, InventoryLog
from accounts.models import CustomUser

# Register your models here.
class InventoryAdmin(admin.ModelAdmin):
    list_display = (
        "company",
        "part",
        "total_blanks",
        "finished_blanks",
        "created_at",
        "updated_at",
    )
    readonly_fields = (
        "total_blanks",
        "finished_blanks",
        "created_at",
        "updated_at",
    )

    def has_module_permission(self, request):
        # Any active staff user with a role can see the Inventory app in admin
        return bool(request.user and request.user.is_active and request.user.is_staff)

    def has_view_permission(self, request, obj=None):
        # All staff users (ADMIN, MANAGER, STOCK_MANAGER) can view inventory records
        if not (request.user and request.user.is_active and request.user.is_staff):
            return False
        return True

    def has_change_permission(self, request, obj=None):
        """
        Only ADMIN and STOCK_MANAGER can modify inventory from the admin.
        MANAGER users are read-only here.
        """
        if not (request.user and request.user.is_active and request.user.is_staff):
            return False
        role = getattr(request.user, "role", None)
        return role in (CustomUser.ADMIN, CustomUser.STOCK_MANAGER)

    def has_add_permission(self, request):
        """
        Only ADMIN and STOCK_MANAGER can create new Inventory rows from admin.
        MANAGER users are read-only.
        """
        if not (request.user and request.user.is_active and request.user.is_staff):
            return False
        role = getattr(request.user, "role", None)
        return role in (CustomUser.ADMIN, CustomUser.STOCK_MANAGER)

    def has_delete_permission(self, request, obj=None):
        """
        Only ADMIN and STOCK_MANAGER can delete inventory from admin.
        Deletion is a permanent delete.
        """
        if not (request.user and request.user.is_active and request.user.is_staff):
            return False
        role = getattr(request.user, "role", None)
        return role in (CustomUser.ADMIN, CustomUser.STOCK_MANAGER)

    def delete_model(self, request, obj):
        # Hard delete: remove the row from the database
        obj.delete()

    def delete_queryset(self, request, queryset):
        # Hard delete for bulk deletes
        queryset.delete()


admin.site.register(Inventory, InventoryAdmin)


class InventoryLogAdmin(admin.ModelAdmin):
    """
    Allow all staff roles to view logs, but nobody edits/deletes them directly.
    """

    readonly_fields = (
        "inventory",
        "change_type",
        "quantity",
        "reason",
        "created_by",
        "created_at",
    )

    def has_module_permission(self, request):
        return bool(request.user and request.user.is_active and request.user.is_staff)

    def has_view_permission(self, request, obj=None):
        if not (request.user and request.user.is_active and request.user.is_staff):
            return False
        return True

    def has_change_permission(self, request, obj=None):
        # Logs are append-only; no edits in admin
        return False

    def has_add_permission(self, request):
        # Logs are system-created only
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(InventoryLog, InventoryLogAdmin)