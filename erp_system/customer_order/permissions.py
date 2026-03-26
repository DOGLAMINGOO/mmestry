from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrManagerForWrite(BasePermission):
    """
    Allows write operations (POST/PUT/PATCH/DELETE) only to ADMIN or MANAGER (or superuser).
    Read-only (GET, HEAD, OPTIONS) is allowed to any authenticated user.
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return False

        # Allow safe methods for any authenticated user
        if request.method in SAFE_METHODS:
            return True

        role = getattr(user, "role", None)
        # Fallbacks in case a non-CustomUser is used
        if user.is_superuser:
            return True

        return role in ("ADMIN", "MANAGER")

