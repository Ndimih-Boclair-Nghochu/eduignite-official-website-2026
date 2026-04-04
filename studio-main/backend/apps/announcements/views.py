from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from .models import Announcement, AnnouncementRead
from .serializers import (
    AnnouncementListSerializer, AnnouncementDetailSerializer,
    AnnouncementCreateSerializer, AnnouncementReadSerializer
)


class AnnouncementViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'view_count']
    ordering = ['-is_pinned', '-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return AnnouncementCreateSerializer
        elif self.action == 'retrieve':
            return AnnouncementDetailSerializer
        return AnnouncementListSerializer

    def get_queryset(self):
        user = self.request.user
        announcements = Announcement.objects.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gte=timezone.now())
        )

        if user.role == 'executive':
            return announcements
        elif user.role in ['school_admin', 'sub_admin']:
            return announcements.filter(
                Q(school=user.school) | Q(school__isnull=True)
            )
        else:
            return announcements.filter(
                Q(
                    school=user.school,
                    Q(target='ALL') |
                    Q(target='SCHOOL_ALL') |
                    Q(target=user.role.upper()) |
                    (Q(target='PERSONAL') & Q(target_user=user))
                ) |
                Q(school__isnull=True, target='ALL')
            )

    def check_permissions(self, request):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            if request.user.role not in ['school_admin', 'sub_admin', 'executive']:
                self.permission_denied(request)
        return super().check_permissions(request)

    def perform_create(self, serializer):
        if self.request.user.school:
            serializer.save(sender=self.request.user, school=self.request.user.school)
        else:
            serializer.save(sender=self.request.user)

    def perform_destroy(self, instance):
        user = self.request.user
        if user != instance.sender and user.role not in ['school_admin', 'executive']:
            self.permission_denied(self.request)
        instance.delete()

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark announcement as read"""
        announcement = self.get_object()
        AnnouncementRead.objects.get_or_create(announcement=announcement, user=request.user)
        announcement.view_count += 1
        announcement.save()
        return Response({'status': 'announcement marked as read'})

    @action(detail=False, methods=['get'])
    def pinned(self, request):
        """Get pinned announcements"""
        announcements = self.get_queryset().filter(is_pinned=True)
        serializer = AnnouncementListSerializer(announcements, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_announcements(self, request):
        """Get personalized announcement feed for current user"""
        announcements = self.get_queryset()
        serializer = AnnouncementListSerializer(announcements, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def platform_wide(self, request):
        """Get platform-wide announcements (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        announcements = Announcement.objects.filter(school__isnull=True)
        serializer = AnnouncementListSerializer(announcements, many=True, context={'request': request})
        return Response(serializer.data)
