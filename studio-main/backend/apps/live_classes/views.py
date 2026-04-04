"""
Live Classes API views.

Endpoints:
  GET    /live-classes/         — list all classes (school-scoped)
  POST   /live-classes/         — teacher/admin creates a class
  GET    /live-classes/{id}/    — detail view
  PUT    /live-classes/{id}/    — teacher/admin updates
  DELETE /live-classes/{id}/    — teacher/admin cancels
  POST   /live-classes/{id}/enroll/      — student enrolls
  POST   /live-classes/{id}/unenroll/    — student unenrolls
  POST   /live-classes/{id}/start/       — teacher starts session
  POST   /live-classes/{id}/end/         — teacher ends session
  GET    /live-classes/my_classes/       — teacher's own classes
  GET    /live-classes/enrolled/         — student's enrolled classes
  GET    /live-classes/live_now/         — currently live sessions
  GET    /live-classes/upcoming/         — next 7 days
  GET    /live-classes/stats/            — analytics for admin
"""

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import LiveClass, LiveClassEnrollment, LiveClassStatus
from .serializers import (
    LiveClassSerializer,
    LiveClassCreateSerializer,
    LiveClassEnrollmentSerializer,
)
from core.permissions import IsTeacher, IsSchoolAdmin, IsSchoolStaff


class LiveClassViewSet(viewsets.ModelViewSet):
    """
    CRUD for live class sessions with role-based access control.
    School-scoped: each school only sees its own sessions.
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'target_class', 'teacher']
    search_fields = ['title', 'subject_name', 'teacher__name', 'target_class']
    ordering_fields = ['start_time', 'created']
    ordering = ['-start_time']

    def get_queryset(self):
        user = self.request.user
        qs = LiveClass.objects.select_related(
            'teacher', 'subject', 'school'
        ).prefetch_related('enrollments')

        # Platform executives see all
        if user.is_platform_executive:
            return qs

        # School-scoped for everyone else
        if not user.school:
            return qs.none()

        qs = qs.filter(school=user.school)

        # Auto-refresh statuses on list
        now = timezone.now()
        qs.filter(
            status=LiveClassStatus.UPCOMING,
            start_time__lte=now,
        ).update(status=LiveClassStatus.LIVE)
        qs.filter(
            status=LiveClassStatus.LIVE,
            start_time__lt=now - timezone.timedelta(minutes=1),
        ).exclude(
            start_time__gte=now - timezone.timedelta(minutes=1)
        )

        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LiveClassCreateSerializer
        return LiveClassSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsSchoolStaff()]
        if self.action == 'destroy':
            return [IsAuthenticated(), IsSchoolAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(
            teacher=self.request.user,
            school=self.request.user.school,
        )

    # ── Custom actions ─────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def my_classes(self, request):
        """Sessions taught by the current teacher."""
        qs = self.get_queryset().filter(teacher=request.user)
        serializer = LiveClassSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'])
    def enrolled(self, request):
        """Classes the current student is enrolled in."""
        enrolled_ids = LiveClassEnrollment.objects.filter(
            student=request.user
        ).values_list('live_class_id', flat=True)
        qs = self.get_queryset().filter(id__in=enrolled_ids)
        serializer = LiveClassSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'])
    def live_now(self, request):
        """Currently live sessions."""
        qs = self.get_queryset().filter(status=LiveClassStatus.LIVE)
        serializer = LiveClassSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Sessions in the next 7 days."""
        now = timezone.now()
        qs = self.get_queryset().filter(
            status=LiveClassStatus.UPCOMING,
            start_time__gte=now,
            start_time__lte=now + timezone.timedelta(days=7),
        )
        serializer = LiveClassSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Aggregated stats for admin dashboards."""
        qs = self.get_queryset()
        now = timezone.now()
        return Response({
            'total': qs.count(),
            'live_now': qs.filter(status=LiveClassStatus.LIVE).count(),
            'upcoming': qs.filter(
                status=LiveClassStatus.UPCOMING,
                start_time__gte=now,
            ).count(),
            'ended_today': qs.filter(
                status=LiveClassStatus.ENDED,
                start_time__date=now.date(),
            ).count(),
            'cancelled': qs.filter(status=LiveClassStatus.CANCELLED).count(),
        })

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """Student enrolls in a class."""
        live_class = self.get_object()
        student = request.user

        if live_class.status == LiveClassStatus.CANCELLED:
            return Response(
                {'message': 'Cannot enroll in a cancelled class.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment, created = LiveClassEnrollment.objects.get_or_create(
            live_class=live_class,
            student=student,
        )
        if not created:
            return Response({'message': 'Already enrolled.'}, status=status.HTTP_200_OK)

        live_class.enrolled_count = live_class.enrollments.count()
        live_class.save(update_fields=['enrolled_count'])
        return Response({'message': 'Enrolled successfully.'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def unenroll(self, request, pk=None):
        """Student unenrolls from a class."""
        live_class = self.get_object()
        deleted, _ = LiveClassEnrollment.objects.filter(
            live_class=live_class, student=request.user
        ).delete()
        if deleted:
            live_class.enrolled_count = live_class.enrollments.count()
            live_class.save(update_fields=['enrolled_count'])
            return Response({'message': 'Unenrolled.'})
        return Response({'message': 'Not enrolled.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Teacher marks session as live."""
        live_class = self.get_object()
        if live_class.teacher != request.user and not request.user.is_school_admin:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        live_class.status = LiveClassStatus.LIVE
        live_class.save(update_fields=['status'])
        return Response(LiveClassSerializer(live_class, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """Teacher marks session as ended."""
        live_class = self.get_object()
        if live_class.teacher != request.user and not request.user.is_school_admin:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        live_class.status = LiveClassStatus.ENDED
        live_class.save(update_fields=['status'])
        return Response(LiveClassSerializer(live_class, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Admin or teacher cancels a session."""
        live_class = self.get_object()
        if live_class.teacher != request.user and not request.user.is_school_admin:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        live_class.status = LiveClassStatus.CANCELLED
        live_class.save(update_fields=['status'])
        return Response({'message': 'Class cancelled.'})

    def destroy(self, request, *args, **kwargs):
        """Override delete to cancel instead of hard delete."""
        live_class = self.get_object()
        live_class.status = LiveClassStatus.CANCELLED
        live_class.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)
