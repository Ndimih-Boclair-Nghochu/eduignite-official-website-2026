from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Count
from drf_spectacular.utils import extend_schema
import logging

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

        users_queryset = User.objects.all()
        schools_queryset = School.objects.all()

        users_by_role = (
            users_queryset.values('role')
            .annotate(count=Count('id'))
            .order_by('role')
        )

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
            'total_users': users_queryset.count(),
            'active_users': users_queryset.filter(is_active=True).count(),
            'users_by_role': list(users_by_role),
            'total_students': users_queryset.filter(role='STUDENT').count(),
            'total_teachers': users_queryset.filter(role='TEACHER').count(),
            'total_parents': users_queryset.filter(role='PARENT').count(),
            'license_paid_count': users_queryset.filter(is_license_paid=True).count(),
            'license_unpaid_count': users_queryset.filter(is_license_paid=False).count(),
            'schools_by_status': list(schools_by_status),
            'schools_by_region': list(schools_by_region),
            'total_student_enrollments': sum(s.student_count for s in schools_queryset),
            'total_teachers_employed': sum(s.teacher_count for s in schools_queryset),
        }

        return Response(stats_data)


class ClearDemoDataView(APIView):
    """
    POST /platform/clear-demo-data/

    Deletes all seeded demo data (users with DEMO_ matricules, the demo school
    and all cascaded records). Only accessible by SUPER_ADMIN or CEO.

    Returns a summary of deleted records.
    """

    permission_classes = [IsAuthenticated, IsExecutive]

    DEMO_MATRICULES = [
        'EDUI26CEO001', 'EDUI26CTO001', 'EDUI26COO001', 'EDUI26INV001',
        'GBHS26ADM001', 'GBHS26SUB001',
        'GBHS26T001', 'GBHS26T002', 'GBHS26T003',
        'GBHS26S001', 'GBHS26S002', 'GBHS26S003',
        'GBHS26P001', 'GBHS26BRS001', 'GBHS26LIB001',
    ]
    DEMO_SCHOOL_SHORT_NAME = 'GBHS Deido'

    def post(self, request, *args, **kwargs):
        from apps.schools.models import School
        from django.db import transaction

        if request.user.role not in ('SUPER_ADMIN', 'CEO'):
            return Response(
                {'message': 'Only SUPER_ADMIN or CEO can clear demo data.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            summary = {}

            # Delete demo school (cascades to students, grades, attendance, etc.)
            schools_deleted, school_detail = School.objects.filter(
                short_name=self.DEMO_SCHOOL_SHORT_NAME
            ).delete()
            summary['schools_deleted'] = schools_deleted
            summary['school_cascade'] = {
                k.split('.')[-1]: v for k, v in school_detail.items() if v
            }

            # Delete demo users (any remaining after cascade)
            users_deleted, _ = User.objects.filter(
                matricule__in=self.DEMO_MATRICULES
            ).delete()
            summary['users_deleted'] = users_deleted

        logger.info(
            f"Demo data cleared by {request.user.matricule} ({request.user.role}). "
            f"Summary: {summary}"
        )

        return Response({
            'message': 'Demo data cleared successfully.',
            'summary': summary,
        })
