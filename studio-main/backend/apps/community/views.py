from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from .models import Testimony, CommunityBlog, BlogComment
from .serializers import (
    TestimonySerializer, TestimonyCreateSerializer,
    CommunityBlogListSerializer, CommunityBlogDetailSerializer,
    CommunityBlogCreateSerializer, BlogCommentSerializer
)


class TestimonyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['school_name', 'message']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return TestimonyCreateSerializer
        return TestimonySerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'executive':
            return Testimony.objects.all()
        else:
            return Testimony.objects.filter(status='approved')

    def check_permissions(self, request):
        if self.action in ['update', 'partial_update', 'destroy']:
            if request.user.role != 'executive':
                self.permission_denied(request)
        return super().check_permissions(request)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a testimony (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        testimony = self.get_object()
        testimony.status = 'approved'
        testimony.approved_by = request.user
        testimony.approved_at = timezone.now()
        testimony.save()

        return Response({'status': 'testimony approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a testimony (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        testimony = self.get_object()
        testimony.status = 'rejected'
        testimony.approved_by = request.user
        testimony.approved_at = timezone.now()
        testimony.save()

        return Response({'status': 'testimony rejected'})

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending testimonies (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        testimonies = Testimony.objects.filter(status='pending')
        serializer = TestimonySerializer(testimonies, many=True)
        return Response(serializer.data)


class CommunityBlogViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'paragraphs']
    ordering_fields = ['created_at', 'view_count', 'published_at']
    ordering = ['-published_at', '-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CommunityBlogCreateSerializer
        elif self.action == 'retrieve' or self.action == 'view':
            return CommunityBlogDetailSerializer
        return CommunityBlogListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'executive':
            return CommunityBlog.objects.all()
        else:
            queryset = CommunityBlog.objects.filter(is_published=True)
            return queryset | CommunityBlog.objects.filter(author=user)

    def check_permissions(self, request):
        if self.action in ['update', 'partial_update', 'destroy']:
            if request.user.role not in ['executive']:
                self.permission_denied(request)
        return super().check_permissions(request)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a blog (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        blog = self.get_object()
        blog.is_published = True
        blog.published_at = timezone.now()
        blog.save()

        return Response({'status': 'blog published'})

    @action(detail=True, methods=['get'])
    def view(self, request, pk=None):
        """View a blog and increment view count"""
        blog = self.get_object()
        blog.view_count += 1
        blog.save()

        serializer = CommunityBlogDetailSerializer(blog)
        return Response(serializer.data)


class BlogCommentViewSet(viewsets.ModelViewSet):
    serializer_class = BlogCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['created_at']

    def get_queryset(self):
        return BlogComment.objects.filter(is_approved=True)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def check_permissions(self, request):
        if self.action in ['update', 'partial_update', 'destroy']:
            if request.user.role != 'executive':
                self.permission_denied(request)
        return super().check_permissions(request)
