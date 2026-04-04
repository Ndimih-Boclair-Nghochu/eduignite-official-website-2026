from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin for authentication."""

    list_display = ('matricule', 'name', 'email', 'role', 'school', 'is_active')
    list_filter = ('role', 'is_active', 'is_license_paid', 'date_joined')
    search_fields = ('matricule', 'name', 'email')
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('matricule', 'password')}),
        ('Personal Info', {'fields': ('name', 'email', 'phone', 'whatsapp', 'avatar')}),
        ('Role & School', {'fields': ('role', 'school', 'uid')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('License & AI', {'fields': ('is_license_paid', 'ai_request_count')}),
        ('Academic', {'fields': ('annual_avg',)}),
        ('Important Dates', {'fields': ('date_joined', 'last_login')}),
    )

    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('matricule', 'password1', 'password2')}),
        ('Personal Info', {'fields': ('name', 'email', 'role')}),
    )

    filter_horizontal = ('groups', 'user_permissions')
