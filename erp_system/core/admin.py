from django.contrib import admin
from django.contrib.auth import get_user_model

from .models import Company, Part, Client, Machine, Operator


User = get_user_model()


class AdminOnlyAddMixin:
    """
    Restrict adding new records to ADMIN role (or superuser).
    Editing/deleting can still follow the default Django admin permissions.
    """

    def has_add_permission(self, request):
        base_can_add = super().has_add_permission(request)
        if not base_can_add:
            return False

        user = request.user
        user_role = getattr(user, "role", None)
        admin_role = getattr(User, "ADMIN", None)

        return bool(user.is_superuser or (user_role and admin_role and user_role == admin_role))


@admin.register(Company)
class CompanyAdmin(AdminOnlyAddMixin, admin.ModelAdmin):
    list_display = ("code", "name")


@admin.register(Part)
class PartAdmin(AdminOnlyAddMixin, admin.ModelAdmin):
    list_display = ("part_number", "name", "cycle_time_minutes")


@admin.register(Client)
class ClientAdmin(AdminOnlyAddMixin, admin.ModelAdmin):
    list_display = ("name",)

@admin.register(Machine)
class MachineAdmin(AdminOnlyAddMixin, admin.ModelAdmin):
    list_display = ("name", "is_active")

@admin.register(Operator)
class OperatorAdmin(AdminOnlyAddMixin, admin.ModelAdmin):
    list_display = ("name", "is_active")