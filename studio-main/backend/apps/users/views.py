from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.db import transaction
from django.utils import timezone
from django.conf import settings as django_settings
from drf_spectacular.utils import extend_schema
from datetime import timedelta
import logging
import os
import uuid

from .serializers import (
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserRoleUpdateSerializer,
    LicenseToggleSerializer,
    ProfileUpdateSerializer,
    FounderProfileSerializer,
    FounderProfileCreateSerializer,
    FounderProfileUpdateSerializer,
    FounderShareCreateSerializer,
)
from .permissions import IsExecutiveOrSchoolAdmin, IsExecutive, IsOwnerOrExecutive, IsPrimaryFounder
from .models import FounderProfile, FounderShareAdjustment

User = get_user_model()
logger = logging.getLogger(__name__)


def sync_primary_founders():
    founder_defaults = {
        'CEO': {'founder_title': 'Chief Executive Officer & Co-Founder', 'primary_share_percentage': '40.00'},
        'CTO': {'founder_title': 'Chief Technology Officer & Co-Founder', 'primary_share_percentage': '27.00'},
    }

    for role, defaults in founder_defaults.items():
        user = User.objects.filter(role=role).first()
        if not user:
            continue
        FounderProfile.objects.update_or_create(
            user=user,
            defaults={
                'founder_title': defaults['founder_title'],
                'primary_share_percentage': defaults['primary_share_percentage'],
                'is_primary_founder': True,
                'can_be_removed': False,
            },
        )


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users with role-based access control.
    """

    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            if self.request.user.is_platform_executive:
                return UserUpdateSerializer
            else:
                return ProfileUpdateSerializer
        elif self.action == 'update_role':
            return UserRoleUpdateSerializer
        elif self.action == 'toggle_license':
            return LicenseToggleSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        return UserListSerializer

    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        queryset = User.objects.all()

        if user.is_platform_executive:
            return queryset

        if user.is_school_admin:
            return queryset.filter(school=user.school)

        return User.objects.filter(id=user.id)

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action == 'create':
            permission_classes = [IsExecutive]
        elif self.action in ['update', 'partial_update', 'destroy', 'update_role', 'toggle_license']:
            permission_classes = [IsOwnerOrExecutive]
        elif self.action in ['executives', 'by_school']:
            permission_classes = [IsAuthenticated]
        elif self.action == 'stats':
            permission_classes = [IsExecutive]
        elif self.action == 'me':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @extend_schema(
        description='List all users with role-based filtering',
        tags=['Users'],
    )
    def list(self, request, *args, **kwargs):
        """List users based on requesting user's role."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description='Retrieve a specific user',
        tags=['Users'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve user details."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        request=UserCreateSerializer,
        description='Create a new user (Executive only)',
        tags=['Users'],
    )
    def create(self, request, *args, **kwargs):
        """Create new user (executives only)."""
        return super().create(request, *args, **kwargs)

    @extend_schema(
        description='Update user (own profile or executive)',
        tags=['Users'],
    )
    def update(self, request, *args, **kwargs):
        """Update user details."""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description='Partially update user',
        tags=['Users'],
    )
    def partial_update(self, request, *args, **kwargs):
        """Partially update user."""
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        description='Delete user (Executive only)',
        tags=['Users'],
    )
    def destroy(self, request, *args, **kwargs):
        """Delete user (executives only)."""
        user = self.get_object()
        if user.role in ['CEO', 'CTO']:
            return Response(
                {'detail': 'Primary founder accounts cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    @extend_schema(
        description='Get or update current authenticated user profile',
        tags=['Users'],
    )
    def me(self, request):
        """Return or update current user's profile."""
        if request.method == 'PATCH':
            serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(UserDetailSerializer(request.user).data)
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    @extend_schema(
        description='Upload avatar image file for current user',
        tags=['Users'],
    )
    def upload_avatar(self, request):
        """Upload avatar image and save URL to user profile."""
        file = request.FILES.get('avatar')
        if not file:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            return Response(
                {'detail': 'Invalid file type. Use JPEG, PNG, GIF, or WebP.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > 5 * 1024 * 1024:
            return Response(
                {'detail': 'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = os.path.splitext(file.name)[1].lower() or '.jpg'
        filename = f'{uuid.uuid4().hex}{ext}'

        avatar_dir = os.path.join(django_settings.MEDIA_ROOT, 'avatars')
        os.makedirs(avatar_dir, exist_ok=True)
        filepath = os.path.join(avatar_dir, filename)

        with open(filepath, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        avatar_url = request.build_absolute_uri(f'{django_settings.MEDIA_URL}avatars/{filename}')
        request.user.avatar = avatar_url
        request.user.save(update_fields=['avatar'])

        return Response({'avatar_url': avatar_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrExecutive])
    @extend_schema(
        request=LicenseToggleSerializer,
        description='Toggle user license payment status',
        tags=['Users'],
    )
    def toggle_license(self, request, id=None):
        """Toggle license paid status for a user."""
        user = self.get_object()
        serializer = LicenseToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.is_license_paid = serializer.validated_data['is_license_paid']
        user.save(update_fields=['is_license_paid'])

        return Response(UserDetailSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsExecutive])
    @extend_schema(
        request=UserRoleUpdateSerializer,
        description='Update user role (Executive only)',
        tags=['Users'],
    )
    def update_role(self, request, id=None):
        """Update user role (executives only)."""
        user = self.get_object()
        serializer = UserRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.role = serializer.validated_data['role']
        user.save(update_fields=['role'])

        return Response(
            UserDetailSerializer(user).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    @extend_schema(
        description='Filter users by school',
        tags=['Users'],
    )
    def by_school(self, request):
        """Filter users by specific school."""
        school_id = request.query_params.get('school_id')
        if not school_id:
            return Response(
                {'detail': 'school_id query parameter required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset().filter(school__id=school_id)
        serializer = UserListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    @extend_schema(
        description='List all platform executives',
        tags=['Users'],
    )
    def executives(self, request):
        """List all platform executives."""
        executive_roles = [
            'SUPER_ADMIN',
            'CEO',
            'CTO',
            'COO',
            'INV',
            'DESIGNER',
        ]
        queryset = User.objects.filter(role__in=executive_roles)
        serializer = UserListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsExecutive])
    @extend_schema(
        description='Get user statistics across platform',
        tags=['Users'],
    )
    def stats(self, request):
        """Get user statistics."""
        stats_data = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'by_role': User.objects.values('role').annotate(count=Count('id')),
            'license_paid': User.objects.filter(is_license_paid=True).count(),
            'by_school': User.objects.values('school__name').annotate(count=Count('id')),
        }
        return Response(stats_data)


class FounderProfileViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FounderProfileSerializer
    queryset = FounderProfile.objects.select_related('user').prefetch_related('share_adjustments__added_by')
    lookup_field = 'pk'

    def get_permissions(self):
        if self.action in ['create', 'partial_update', 'destroy', 'add_shares', 'renew_shares']:
            permission_classes = [IsPrimaryFounder]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return FounderProfileCreateSerializer
        if self.action == 'partial_update':
            return FounderProfileUpdateSerializer
        if self.action == 'add_shares':
            return FounderShareCreateSerializer
        return FounderProfileSerializer

    def list(self, request, *args, **kwargs):
        sync_primary_founders()
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        founder = serializer.save()
        response_serializer = FounderProfileSerializer(founder, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        founder = self.get_object()
        serializer = self.get_serializer(founder, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        founder = serializer.save()
        response_serializer = FounderProfileSerializer(founder, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        founder = self.get_object()
        if founder.is_primary_founder or not founder.can_be_removed:
            return Response(
                {'detail': 'Primary founders cannot be removed from the system.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        founder.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsPrimaryFounder])
    @transaction.atomic
    def add_shares(self, request, pk=None):
        founder = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        duration_days = serializer.validated_data['duration_days']
        expires_at = timezone.now() + timedelta(days=duration_days)
        FounderShareAdjustment.objects.create(
            founder=founder,
            percentage=serializer.validated_data['percentage'],
            note=serializer.validated_data.get('note', ''),
            added_by=request.user,
            expires_at=expires_at,
        )
        founder.refresh_from_db()
        response_serializer = FounderProfileSerializer(founder, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsPrimaryFounder])
    @transaction.atomic
    def renew_shares(self, request, pk=None):
        """Renew a founder's share period. Reactivates deactivated founders."""
        founder = self.get_object()
        if not founder.has_renewable_shares:
            return Response(
                {'detail': 'This founder does not have renewable shares.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        founder.shares_expire_at = timezone.now() + timedelta(days=founder.share_renewal_period_days)
        founder.save(update_fields=['shares_expire_at'])
        # Reactivate the user account if it was deactivated due to expired shares
        if not founder.user.is_active:
            founder.user.is_active = True
            founder.user.save(update_fields=['is_active'])
        founder.refresh_from_db()
        response_serializer = FounderProfileSerializer(founder, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], permission_classes=[IsPrimaryFounder])
    @transaction.atomic
    def remove_share_adjustment(self, request, pk=None):
        """Remove a specific share adjustment only if it has expired (time frame passed)."""
        founder = self.get_object()
        adjustment_id = request.query_params.get('adjustment_id')
        if not adjustment_id:
            return Response(
                {'detail': 'adjustment_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            adjustment = founder.share_adjustments.get(id=adjustment_id)
        except FounderShareAdjustment.DoesNotExist:
            return Response(
                {'detail': 'Share adjustment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if adjustment.is_locked:
            return Response(
                {
                    'detail': (
                        f'This share allocation is locked until {adjustment.expires_at.strftime("%Y-%m-%d")}. '
                        'Shares can only be edited or removed after the time frame expires.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        adjustment.delete()
        founder.refresh_from_db()
        response_serializer = FounderProfileSerializer(founder, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)
