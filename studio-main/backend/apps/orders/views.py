from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from .models import Order
from .serializers import (
    OrderListSerializer, OrderDetailSerializer,
    OrderCreateSerializer, OrderProcessSerializer
)


class IsExecutiveOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role == 'executive'


class OrderViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['full_name', 'school_name', 'email']
    ordering_fields = ['created_at', 'processed_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        elif self.action == 'retrieve':
            return OrderDetailSerializer
        elif self.action == 'process':
            return OrderProcessSerializer
        return OrderListSerializer

    def get_queryset(self):
        user = self.request.user
        if user and user.role == 'executive':
            return Order.objects.all()
        return Order.objects.none()

    def get_permissions(self):
        if self.action == 'create':
            self.permission_classes = [permissions.AllowAny]
        elif self.action in ['list', 'retrieve']:
            self.permission_classes = [permissions.IsAuthenticated]
        else:
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()

    def check_permissions(self, request):
        if self.action in ['list', 'retrieve']:
            if not (request.user and request.user.is_authenticated and request.user.role == 'executive'):
                self.permission_denied(request)
        elif self.action in ['update', 'partial_update', 'destroy', 'process']:
            if not (request.user and request.user.is_authenticated and request.user.role == 'executive'):
                self.permission_denied(request)
        return super().check_permissions(request)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process an order (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        order = self.get_object()
        serializer = OrderProcessSerializer(order, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get order statistics (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        orders = Order.objects.all()
        stats = {
            'total': orders.count(),
            'by_status': dict(orders.values('status').annotate(count=Count('id')).values_list('status', 'count')),
            'pending': orders.filter(status='pending').count(),
            'contacted': orders.filter(status='contacted').count(),
            'processed': orders.filter(status='processed').count(),
            'rejected': orders.filter(status='rejected').count(),
        }
        return Response(stats)
