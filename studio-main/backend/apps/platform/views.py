from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.conf import settings as django_settings
from drf_spectacular.utils import extend_schema
import logging
import os
import uuid

from .models import PlatformSettings, PlatformFees, PublicEvent, TutorialLink
from .serializers import (
    PlatformSettingsSerializer,
    PlatformFeesSerializer,
    PublicEventSerializer,
    TutorialLinkSerializer,
)
from .permissions import IsExecutive

User = get_user_model()
logger = logging.getLogger(__name__)


class PlatformSettingsView(APIView):
    """
    GET /platform/settings/
    PATCH /platform/settings/
    Manage global platform settings.
    """

    def get_permissions(self):
        """Allow GET for all, PATCH for executives only."""
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsExecutive()]

    @extend_schema(
        responses={200: PlatformSettingsSerializer},
        tags=['Platform'],
        description='Get platform settings',
    )
    def get(self, request):
        """Get platform settings."""
        settings = PlatformSettings.load()
        serializer = PlatformSettingsSerializer(settings)
        return Response(serializer.data)

    @extend_schema(
        request=PlatformSettingsSerializer,
        responses={200: PlatformSettingsSerializer},
        tags=['Platform'],
        description='Update platform settings (Executive only)',
    )
    def patch(self, request):
        """Update platform settings (executives only)."""
        settings = PlatformSettings.load()
        serializer = PlatformSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PlatformLogoUploadView(APIView):
    """
    POST /platform/upload-logo/
    Upload a logo image file and store as the platform logo.
    """
    permission_classes = [IsExecutive]

    def post(self, request):
        file = request.FILES.get('logo')
        if not file:
            return Response({'detail': 'No file provided'}, status=400)

        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
        if file.content_type not in allowed_types:
            return Response({'detail': 'Invalid file type. Use JPEG, PNG, GIF, WebP or SVG.'}, status=400)

        if file.size > 5 * 1024 * 1024:
            return Response({'detail': 'File too large. Maximum size is 5MB.'}, status=400)

        ext = os.path.splitext(file.name)[1].lower() or '.png'
        filename = f'platform_logo_{uuid.uuid4().hex}{ext}'
        logo_dir = os.path.join(django_settings.MEDIA_ROOT, 'platform')
        os.makedirs(logo_dir, exist_ok=True)
        filepath = os.path.join(logo_dir, filename)

        with open(filepath, 'wb+') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        logo_url = request.build_absolute_uri(f'{django_settings.MEDIA_URL}platform/{filename}')
        settings = PlatformSettings.load()
        settings.logo = logo_url
        settings.save(update_fields=['logo'])

        return Response({'logo_url': logo_url}, status=200)


class PlatformFeesViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for platform fees.
    """

    queryset = PlatformFees.objects.all()
    serializer_class = PlatformFeesSerializer
    lookup_field = 'id'

    def get_permissions(self):
        """Allow read for all, write for executives only."""
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsExecutive]
        return [permission() for permission in permission_classes]

    @extend_schema(
        description='List all platform fees',
        tags=['Platform'],
    )
    def list(self, request, *args, **kwargs):
        """List all platform fees."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description='Retrieve a specific fee',
        tags=['Platform'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve specific fee."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        request=PlatformFeesSerializer,
        description='Create a new fee (Executive only)',
        tags=['Platform'],
    )
    def create(self, request, *args, **kwargs):
        """Create new fee (executives only)."""
        return super().create(request, *args, **kwargs)

    @extend_schema(
        request=PlatformFeesSerializer,
        description='Update fee (Executive only)',
        tags=['Platform'],
    )
    def update(self, request, *args, **kwargs):
        """Update fee (executives only)."""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description='Partially update fee (Executive only)',
        tags=['Platform'],
    )
    def partial_update(self, request, *args, **kwargs):
        """Partially update fee (executives only)."""
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        description='Delete fee (Executive only)',
        tags=['Platform'],
    )
    def destroy(self, request, *args, **kwargs):
        """Delete fee (executives only)."""
        return super().destroy(request, *args, **kwargs)


class PublicEventViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for public events.
    Allows public read, restricted write.
    """

    queryset = PublicEvent.objects.filter(is_active=True).order_by('order', '-created_at')
    serializer_class = PublicEventSerializer

    def get_permissions(self):
        """Allow read for all, write for executives only."""
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsExecutive]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """Return active events for list, all for admin."""
        if self.request.user.is_authenticated and self.request.user.is_platform_executive:
            return PublicEvent.objects.all().order_by('order', '-created_at')
        return PublicEvent.objects.filter(is_active=True).order_by('order', '-created_at')

    @extend_schema(
        description='List public events',
        tags=['Platform'],
    )
    def list(self, request, *args, **kwargs):
        """List public events."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description='Retrieve a specific event',
        tags=['Platform'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve specific event."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        request=PublicEventSerializer,
        description='Create a new event (Executive only)',
        tags=['Platform'],
    )
    def create(self, request, *args, **kwargs):
        """Create new event (executives only)."""
        return super().create(request, *args, **kwargs)

    @extend_schema(
        request=PublicEventSerializer,
        description='Update event (Executive only)',
        tags=['Platform'],
    )
    def update(self, request, *args, **kwargs):
        """Update event (executives only)."""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description='Partially update event (Executive only)',
        tags=['Platform'],
    )
    def partial_update(self, request, *args, **kwargs):
        """Partially update event (executives only)."""
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        description='Delete event (Executive only)',
        tags=['Platform'],
    )
    def destroy(self, request, *args, **kwargs):
        """Delete event (executives only)."""
        return super().destroy(request, *args, **kwargs)


class TutorialLinkViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for tutorial links.
    """

    queryset = TutorialLink.objects.all().order_by('role', 'title')
    serializer_class = TutorialLinkSerializer

    def get_permissions(self):
        """Allow read for all, write for executives only."""
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsExecutive]
        return [permission() for permission in permission_classes]

    @extend_schema(
        description='List tutorial links',
        tags=['Platform'],
    )
    def list(self, request, *args, **kwargs):
        """List tutorial links."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description='Retrieve a specific tutorial link',
        tags=['Platform'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve specific tutorial link."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        request=TutorialLinkSerializer,
        description='Create a new tutorial link (Executive only)',
        tags=['Platform'],
    )
    def create(self, request, *args, **kwargs):
        """Create new tutorial link (executives only)."""
        return super().create(request, *args, **kwargs)

    @extend_schema(
        request=TutorialLinkSerializer,
        description='Update tutorial link (Executive only)',
        tags=['Platform'],
    )
    def update(self, request, *args, **kwargs):
        """Update tutorial link (executives only)."""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description='Partially update tutorial link (Executive only)',
        tags=['Platform'],
    )
    def partial_update(self, request, *args, **kwargs):
        """Partially update tutorial link (executives only)."""
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        description='Delete tutorial link (Executive only)',
        tags=['Platform'],
    )
    def destroy(self, request, *args, **kwargs):
        """Delete tutorial link (executives only)."""
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    @extend_schema(
        description='Get tutorial links by role',
        tags=['Platform'],
    )
    def by_role(self, request):
        """Get tutorial links for a specific role."""
        role = request.query_params.get('role')
        if not role:
            return Response(
                {'detail': 'role query parameter required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        links = TutorialLink.objects.filter(role=role)
        serializer = TutorialLinkSerializer(links, many=True)
        return Response(serializer.data)


class PlatformStatsView(APIView):
    """
    GET /platform/stats/
    Aggregate statistics across the entire platform.
    """

    permission_classes = [IsExecutive]

    @extend_schema(
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'total_schools': {'type': 'integer'},
                    'total_users': {'type': 'integer'},
                    'active_users': {'type': 'integer'},
                    'users_by_role': {'type': 'object'},
                    'total_students': {'type': 'integer'},
                    'total_teachers': {'type': 'integer'},
                    'total_parents': {'type': 'integer'},
                    'license_paid_count': {'type': 'integer'},
                    'license_unpaid_count': {'type': 'integer'},
                    'schools_by_status': {'type': 'object'},
                    'schools_by_region': {'type': 'object'},
                },
            },
        },
        tags=['Platform'],
        description='Get platform-wide statistics',
    )
    def get(self, request):
        """Get comprehensive platform statistics."""
        from apps.schools.models import School
        from apps.orders.models import Order
        from apps.fees.models import Payment

        users_queryset = User.objects.all()
        schools_queryset = School.objects.all()
        payments_queryset = Payment.objects.filter(status='confirmed')
        orders_queryset = Order.objects.all()

        users_by_role_qs = users_queryset.values('role').annotate(count=Count('id')).order_by('role')
        users_by_role = {item['role']: item['count'] for item in users_by_role_qs}

        schools_by_status = (
            schools_queryset.values('status')
            .annotate(count=Count('id'))
        )

        schools_by_region = (
            schools_queryset.values('region')
            .annotate(count=Count('id'))
        )

        stats_data = {
            'total_schools': schools_queryset.count(),
            'active_schools': schools_queryset.filter(status='Active').count(),
            'total_users': users_queryset.count(),
            'active_users': users_queryset.filter(is_active=True).count(),
            'users_by_role': users_by_role,
            'total_students': users_queryset.filter(role='STUDENT').count(),
            'total_teachers': users_queryset.filter(role='TEACHER').count(),
            'total_parents': users_queryset.filter(role='PARENT').count(),
            'license_paid_count': users_queryset.filter(is_license_paid=True).count(),
            'license_unpaid_count': users_queryset.filter(is_license_paid=False).count(),
            'founder_count': users_queryset.filter(role__in=['CEO', 'CTO']).count(),
            'executive_count': users_queryset.filter(role__in=['SUPER_ADMIN', 'CEO', 'CTO', 'COO', 'INV', 'DESIGNER']).count(),
            'new_orders': orders_queryset.filter(status='pending').count(),
            'total_orders': orders_queryset.count(),
            'total_revenue': str(payments_queryset.aggregate(total=Sum('amount'))['total'] or 0),
            'schools_by_status': list(schools_by_status),
            'schools_by_region': list(schools_by_region),
            'total_student_enrollments': sum(s.student_count for s in schools_queryset),
            'total_teachers_employed': sum(s.teacher_count for s in schools_queryset),
        }

        return Response(stats_data)
