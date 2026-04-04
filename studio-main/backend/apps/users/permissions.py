from rest_framework.permissions import BasePermission


class IsExecutive(BasePermission):
    """
    Permission for platform executives.
    """

    def has_permission(self, request, view):
        """Check if user is a platform executive."""
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_platform_executive
        )


class IsExecutiveOrSchoolAdmin(BasePermission):
    """
    Permission for platform executives or school admins.
    """

    def has_permission(self, request, view):
        """Check if user is executive or school admin."""
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.is_platform_executive or request.user.is_school_admin)
        )


class IsOwnerOrExecutive(BasePermission):
    """
    Permission for user to edit their own profile or executives to edit any.
    """

    def has_object_permission(self, request, view, obj):
        """Check if user is owner or executive."""
        return (
            obj == request.user or request.user.is_platform_executive
        )
