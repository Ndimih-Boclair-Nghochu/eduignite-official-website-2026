from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from .models import SupportContribution
from .serializers import (
    SupportContributionSerializer, SupportContributionCreateSerializer,
    SupportVerifySerializer
)


class SupportContributionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'payment_method']
    search_fields = ['user__first_name', 'user__last_name', 'transaction_reference']
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportContributionCreateSerializer
        elif self.action == 'verify' or self.action == 'reject':
            return SupportVerifySerializer
        return SupportContributionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'executive':
            return SupportContribution.objects.all()
        else:
            return SupportContribution.objects.filter(user=user)

    def check_permissions(self, request):
        if self.action in ['verify', 'reject']:
            if request.user.role != 'executive':
                self.permission_denied(request)
        return super().check_permissions(request)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a contribution (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        contribution = self.get_object()
        serializer = SupportVerifySerializer(contribution, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.validated_data['status'] = 'Verified'
            serializer.save()

            from notifications.models import Notification
            Notification.objects.create(
                user=contribution.user,
                title='Support Contribution Verified',
                message=f"Your contribution of {contribution.amount} {contribution.currency} has been verified",
                notification_type='success'
            )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a contribution (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        contribution = self.get_object()
        contribution.status = 'Rejected'
        contribution.verified_by = request.user
        from django.utils import timezone
        contribution.verified_at = timezone.now()
        contribution.save()

        from notifications.models import Notification
        Notification.objects.create(
            user=contribution.user,
            title='Support Contribution Rejected',
            message=f"Your contribution of {contribution.amount} {contribution.currency} was rejected",
            notification_type='warning'
        )

        return Response({'status': 'contribution rejected'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get support contribution statistics (executive only)"""
        if request.user.role != 'executive':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        all_contributions = SupportContribution.objects.all()
        verified = all_contributions.filter(status='Verified')

        stats = {
            'total_contributions': all_contributions.count(),
            'verified_contributions': verified.count(),
            'new_contributions': all_contributions.filter(status='New').count(),
            'rejected_contributions': all_contributions.filter(status='Rejected').count(),
            'total_verified_amount': verified.aggregate(Sum('amount'))['amount__sum'] or 0,
            'by_currency': dict(verified.values('currency').annotate(total=Sum('amount')).values_list('currency', 'total')),
        }
        return Response(stats)
