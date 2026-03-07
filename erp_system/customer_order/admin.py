from django.contrib import admin
from django.contrib.auth import get_user_model

from .models import CustomerOrder


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

