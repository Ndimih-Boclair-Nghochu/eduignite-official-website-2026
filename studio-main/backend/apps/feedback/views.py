from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from .models import Feedback, FeedbackResponse
from .serializers import (
    FeedbackListSerializer, FeedbackDetailSerializer,
    FeedbackCreateSerializer, FeedbackResolveSerializer,
    FeedbackResponseSerializer
)


class FeedbackViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority']
    search_fields = ['subject', 'message']
    ordering_fields = ['created_at', 'priority']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return FeedbackCreateSerializer
        elif self.action == 'retrieve':
            return FeedbackDetailSerializer
        elif self.action == 'resolve':
            return FeedbackResolveSerializer
        return FeedbackListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'executive':
            return Feedback.objects.all()
        elif user.role in ['school_admin', 'sub_admin']:
            return Feedback.objects.filter(school=user.school)
        else:
            return Feedback.objects.filter(sender=user)

    def check_permissions(self, request):
        if self.action in ['update', 'partial_update', 'destroy']:
            if request.user.role not in ['executive', 'school_admin']:
                self.permission_denied(request)
        return super().check_permissions(request)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user, school=self.request.user.school)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve feedback (executive/school_admin only)"""
        if request.user.role not in ['executive', 'school_admin']:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        feedback = self.get_object()
        serializer = FeedbackResolveSerializer(feedback, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Add a response to feedback (executive/school_admin only)"""
        if request.user.role not in ['executive', 'school_admin']:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        feedback = self.get_object()
        serializer = FeedbackResponseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(feedback=feedback, responder=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def my_feedback(self, request):
        """Get current user's submitted feedbacks"""
        feedbacks = Feedback.objects.filter(sender=request.user)
        serializer = FeedbackListSerializer(feedbacks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get feedback statistics"""
        if request.user.role not in ['executive', 'school_admin']:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        queryset = self.get_queryset()
        stats = {
            'total': queryset.count(),
            'by_status': dict(queryset.values('status').annotate(count=Count('id')).values_list('status', 'count')),
            'by_priority': dict(queryset.values('priority').annotate(count=Count('id')).values_list('priority', 'count')),
            'unresolved': queryset.exclude(status='Resolved').count(),
        }
        return Response(stats)
