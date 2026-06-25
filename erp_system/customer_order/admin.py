from django.contrib import admin
from django.contrib.auth import get_user_model

from .models import CustomerOrder, CustomerOrderLog


User = get_user_model()


class ManagerOrAdminAddMixin:
    """
    Allow adding new records only for users with role ADMIN or MANAGER (or superuser).
    Other staff users can still view/change based on normal Django permissions.
    """

    def has_add_permission(self, request):
        base_can_add = super().has_add_permission(request)
        if not base_can_add:
            return False

        user = request.user
        role = getattr(user, "role", None)
        admin_role = getattr(User, "ADMIN", None)
        manager_role = getattr(User, "MANAGER", None)

        if user.is_superuser:
            return True

        return bool(role and role in (admin_role, manager_role))


@admin.register(CustomerOrder)
class CustomerOrderAdmin(ManagerOrAdminAddMixin, admin.ModelAdmin):
    list_display = (
        "po_number",
        "company",
        "client",
        "part",
        "quantity",
        "deadline",
        "priority",
        "status",
        "created_by",
        "created_at",
    )
    list_filter = ("company", "client", "part", "priority", "status", "deadline", "created_at")
    search_fields = ("po_number", "client__name", "part__name")
    readonly_fields = ("po_number", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CustomerOrderLog)
class CustomerOrderLogAdmin(admin.ModelAdmin):
    list_display = (
        "po_number",
        "action_type",
        "company_name",
        "client_name",
        "part_name",
        "status",
        "quantity",
        "created_by",
        "created_at",
    )
    list_filter = ("action_type", "status", "company_name", "client_name", "created_at")
    search_fields = ("po_number", "company_name", "client_name", "part_name", "reason")
    readonly_fields = (
        "customer_order",
        "po_number",
        "company_name",
        "client_name",
        "part_name",
        "quantity",
        "deadline",
        "priority",
        "status",
        "action_type",
        "reason",
        "created_by",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

