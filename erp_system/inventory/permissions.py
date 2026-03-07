from rest_framework.permissions import BasePermission


class CanAdjustInventory(BasePermission):
    """
    Allows access only to users who are allowed to manually adjust inventory.

    Business rules:
    - ADMIN: full access
    - STOCK_MANAGER: can manually adjust inventory
    - MANAGER: cannot manually adjust inventory
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        # Fallbacks in case a non-CustomUser is used
        role = getattr(user, "role", None)
        if role in ("ADMIN", "STOCK_MANAGER"):
            return True

        return False

