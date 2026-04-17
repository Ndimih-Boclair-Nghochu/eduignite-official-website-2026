from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.conf import settings as django_settings
from drf_spectacular.utils import extend_schema
import logging
import os
import uuid
import base64

from .models import School, SchoolSettings
from .serializers import (
    SchoolListSerializer,
    SchoolDetailSerializer,
    SchoolCreateSerializer,
    SchoolUpdateSerializer,
    SchoolSettingsSerializer,
)
from .permissions import IsExecutiveOrSchoolAdmin, IsExecutive

logger = logging.getLogger(__name__)


class SchoolViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing schools with role-based access control.
    """

    queryset = School.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return SchoolCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SchoolUpdateSerializer
        elif self.action == 'retrieve':
            return SchoolDetailSerializer
        return SchoolListSerializer

    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        queryset = School.objects.all()
        user_school = getattr(user, 'school', None)

        if user.is_platform_executive:
            return queryset

        if user.is_school_admin and user_school:
            return queryset.filter(id=user_school.id)

        if user_school:
            return queryset.filter(id=user_school.id)

        return School.objects.none()

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action == 'create':
            permission_classes = [IsExecutive]
        elif self.action in ['update', 'partial_update', 'destroy', 'toggle_status']:
            permission_classes = [IsExecutiveOrSchoolAdmin]
        elif self.action == 'stats':
            permission_classes = [IsExecutive]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @extend_schema(
        description='List all schools with role-based filtering',
        tags=['Schools'],
    )
    def list(self, request, *args, **kwargs):
        """List schools based on requesting user role."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description='Retrieve a specific school',
        tags=['Schools'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve school details."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        request=SchoolCreateSerializer,
        description='Create a new school (Executive only). Returns the auto-generated matricule for principal account activation.',
        tags=['Schools'],
    )
    def create(self, request, *args, **kwargs):
        """Create new school and return the generated matricule."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        school = serializer.save()
        response_data = SchoolDetailSerializer(school).data
        response_data['matricule'] = getattr(school, 'matricule', '')
        return Response(response_data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=SchoolUpdateSerializer,
        description='Update school (Executive or School Admin)',
        tags=['Schools'],
    )
    def update(self, request, *args, **kwargs):
        """Update school details."""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description='Partially update school',
        tags=['Schools'],
    )
    def partial_update(self, request, *args, **kwargs):
        """Partially update school."""
        return super().partial_update(request, *args, **kwargs)

    def _save_school_media(self, request, school, field_name, subdirectory):
        file = request.FILES.get(field_name)
        if not file:
            return Response(
                {'detail': f'No {field_name} file provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
        if file.content_type not in allowed_types:
            return Response(
                {'detail': 'Invalid file type. Use JPEG, PNG, GIF, WebP or SVG.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > 5 * 1024 * 1024:
            return Response(
                {'detail': 'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        encoded = base64.b64encode(file.read()).decode('utf-8')
        media_data_url = f'data:{file.content_type};base64,{encoded}'
        setattr(school, field_name, media_data_url)
        school.save(update_fields=[field_name])

        return Response(
            {
                f'{field_name}_url': media_data_url,
                field_name: media_data_url,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description='Delete school (Executive only)',
        tags=['Schools'],
    )
    def destroy(self, request, *args, **kwargs):
        """Delete school (executives only)."""
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsExecutiveOrSchoolAdmin], url_path='upload-logo')
    @extend_schema(
        description='Upload and persist a school logo image.',
        tags=['Schools'],
    )
    def upload_logo(self, request, id=None):
        school = self.get_object()
        return self._save_school_media(request, school, 'logo', 'logo')

    @action(detail=True, methods=['post'], permission_classes=[IsExecutiveOrSchoolAdmin], url_path='upload-banner')
    @extend_schema(
        description='Upload and persist a school banner image.',
        tags=['Schools'],
    )
    def upload_banner(self, request, id=None):
        school = self.get_object()
        return self._save_school_media(request, school, 'banner', 'banner')

    @action(detail=True, methods=['post'], permission_classes=[IsExecutiveOrSchoolAdmin])
    @extend_schema(
        request={'type': 'object', 'properties': {'status': {'type': 'string'}}},
        description='Toggle school status',
        tags=['Schools'],
    )
    def toggle_status(self, request, id=None):
        """Toggle school status between Active and Suspended."""
        school = self.get_object()
        new_status = request.data.get('status')

        if not new_status or new_status not in ['Active', 'Suspended', 'Pending']:
            return Response(
                {'detail': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_school = getattr(request.user, 'school', None)
        if request.user.is_school_admin and (not user_school or user_school.id != school.id):
            return Response(
                {'detail': 'You can only modify your own school'},
                status=status.HTTP_403_FORBIDDEN,
            )

        school.status = new_status
        school.save(update_fields=['status'])

        return Response(
            {
                'detail': f'School status updated to {new_status}',
                'status': school.status,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsExecutive])
    @extend_schema(
        description='Get school statistics',
        tags=['Schools'],
    )
    def stats(self, request):
        """Get school statistics."""
        stats_data = {
            'total_schools': School.objects.count(),
            'active_schools': School.objects.filter(status='Active').count(),
            'suspended_schools': School.objects.filter(status='Suspended').count(),
            'pending_schools': School.objects.filter(status='Pending').count(),
            'total_students': sum(s.student_count for s in School.objects.all()),
            'total_teachers': sum(s.teacher_count for s in School.objects.all()),
            'by_region': School.objects.values('region').annotate(count=Count('id')),
        }
        return Response(stats_data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    @extend_schema(
        description='Get current user school',
        tags=['Schools'],
    )
    def my_school(self, request):
        """Return requesting user's school detail."""
        user_school = getattr(request.user, 'school', None)
        if not user_school:
            return Response(
                {'detail': 'User has no associated school'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SchoolDetailSerializer(user_school)
        return Response(serializer.data)


class SchoolSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing school settings.
    """

    queryset = SchoolSettings.objects.all()
    serializer_class = SchoolSettingsSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'school'

    def get_queryset(self):
        """Filter settings based on user role."""
        user = self.request.user
        user_school = getattr(user, 'school', None)
        if user.is_platform_executive:
            return SchoolSettings.objects.all()
        if user.is_school_admin and user_school:
            return SchoolSettings.objects.filter(school=user_school)
        if user_school:
            return SchoolSettings.objects.filter(school=user_school)
        return SchoolSettings.objects.none()

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsExecutiveOrSchoolAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @extend_schema(
        description='List school settings',
        tags=['School Settings'],
    )
    def list(self, request, *args, **kwargs):
        """List school settings."""
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description='Retrieve school settings',
        tags=['School Settings'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve school settings."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        request=SchoolSettingsSerializer,
        description='Create school settings',
        tags=['School Settings'],
    )
    def create(self, request, *args, **kwargs):
        """Create school settings."""
        return super().create(request, *args, **kwargs)

    @extend_schema(
        request=SchoolSettingsSerializer,
        description='Update school settings',
        tags=['School Settings'],
    )
    def update(self, request, *args, **kwargs):
        """Update school settings."""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description='Partially update school settings',
        tags=['School Settings'],
    )
    def partial_update(self, request, *args, **kwargs):
        """Partially update school settings."""
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        description='Delete school settings',
        tags=['School Settings'],
    )
    def destroy(self, request, *args, **kwargs):
        """Delete school settings."""
        return super().destroy(request, *args, **kwargs)
