from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum, DecimalField, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from decimal import Decimal

from .models import FeeStructure, Payment, Invoice
from .serializers import (
    FeeStructureSerializer, PaymentListSerializer, PaymentDetailSerializer,
    PaymentCreateSerializer, PaymentConfirmSerializer, InvoiceSerializer,
    RevenueReportSerializer,
)
from .utils import generate_reference_number, generate_receipt_number, generate_invoice_number

_FEE_STAFF = ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']


def _require_school(user):
    """Raise a clear error if the user has no school assigned."""
    if not user.school_id:
        raise PermissionDenied("Your account is not assigned to a school. Contact the platform admin.")


class FeeStructureViewSet(viewsets.ModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in _FEE_STAFF and user.school_id:
            return FeeStructure.objects.filter(school_id=user.school_id)
        return FeeStructure.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can create fee structures.")
        _require_school(request.user)
        request.data['school'] = request.user.school_id
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can update fee structures.")
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can delete fee structures.")
        return super().destroy(request, *args, **kwargs)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('payer', 'fee_structure', 'bursar', 'school')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        if self.action == 'retrieve':
            return PaymentDetailSerializer
        if self.action in ['confirm', 'reject']:
            return PaymentConfirmSerializer
        return PaymentListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related('payer', 'fee_structure', 'bursar', 'school')
        if user.role in _FEE_STAFF and user.school_id:
            return qs.filter(school_id=user.school_id)
        if user.role in ['STUDENT', 'PARENT']:
            return qs.filter(payer=user)
        return qs.none()

    def create(self, request, *args, **kwargs):
        if request.user.role not in _FEE_STAFF:
            raise PermissionDenied("Only bursars and administrators can record payments.")
        _require_school(request.user)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Ensure payer belongs to same school
        payer = serializer.validated_data.get('payer')
        if payer and str(payer.school_id) != str(request.user.school_id):
            raise PermissionDenied("The payer does not belong to your school.")

        payment = serializer.save(
            school_id=request.user.school_id,
            bursar=request.user,
            reference_number=generate_reference_number(),
        )
        return Response(PaymentDetailSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Bursar confirms a pending payment and generates a receipt + invoice."""
        if request.user.role not in _FEE_STAFF:
            raise PermissionDenied("Only bursars and administrators can confirm payments.")
        _require_school(request.user)

        payment = self.get_object()

        # Cross-school guard
        if str(payment.school_id) != str(request.user.school_id):
            raise PermissionDenied("You can only confirm payments for your own school.")

        if payment.status != 'pending':
            return Response({'error': f'Payment is already {payment.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PaymentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receipt_number = serializer.validated_data.get('receipt_number') or generate_receipt_number()
        payment.status = 'confirmed'
        payment.confirmed_at = timezone.now()
        payment.receipt_number = receipt_number
        payment.bursar = request.user
        payment.save(update_fields=['status', 'confirmed_at', 'receipt_number', 'bursar'])

        invoice = Invoice.objects.create(
            payment=payment,
            invoice_number=generate_invoice_number(),
            issued_by=request.user,
        )
        return Response(
            {'payment': PaymentDetailSerializer(payment).data, 'invoice': InvoiceSerializer(invoice).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending payment with an optional reason."""
        if request.user.role not in _FEE_STAFF:
            raise PermissionDenied("Only bursars and administrators can reject payments.")
        _require_school(request.user)

        payment = self.get_object()

        if str(payment.school_id) != str(request.user.school_id):
            raise PermissionDenied("You can only reject payments for your own school.")

        if payment.status != 'pending':
            return Response({'error': 'Only pending payments can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        payment.status = 'rejected'
        payment.notes = request.data.get('reason', '')
        payment.save(update_fields=['status', 'notes'])
        return Response(PaymentDetailSerializer(payment).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def my_payments(self, request):
        """Current user's own payment history."""
        queryset = Payment.objects.select_related('fee_structure').filter(payer=request.user)
        serializer = PaymentListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def revenue_report(self, request):
        """Revenue summary by period, method, and fee type."""
        if request.user.role not in _FEE_STAFF:
            raise PermissionDenied("Only school staff can view revenue reports.")
        _require_school(request.user)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        zero = Value(Decimal('0.00'), output_field=DecimalField())
        base_qs = Payment.objects.filter(school_id=request.user.school_id)
        confirmed_qs = base_qs.filter(status='confirmed')
        if start_date:
            confirmed_qs = confirmed_qs.filter(payment_date__gte=start_date)
        if end_date:
            confirmed_qs = confirmed_qs.filter(payment_date__lte=end_date)

        def _sum(qs):
            return qs.aggregate(s=Coalesce(Sum('amount'), zero))['s']

        by_method = {
            method: float(_sum(confirmed_qs.filter(payment_method=method)))
            for method, _ in Payment.PAYMENT_METHOD_CHOICES
        }
        by_fee_type = {
            row['fee_structure__name']: float(row['total'])
            for row in confirmed_qs.values('fee_structure__name').annotate(total=Sum('amount'))
            if row['fee_structure__name']
        }

        data = {
            'total_collected': float(_sum(confirmed_qs)),
            'total_pending':   float(_sum(base_qs.filter(status='pending'))),
            'total_rejected':  float(_sum(base_qs.filter(status='rejected'))),
            'period': f"{start_date or 'All'} to {end_date or 'All'}",
            'by_method': by_method,
            'by_fee_type': by_fee_type,
            'payment_count': confirmed_qs.count(),
        }
        return Response(RevenueReportSerializer(data).data)

    @action(detail=False, methods=['get'])
    def outstanding_fees(self, request):
        """Users in the school who have not fully paid a fee structure."""
        if request.user.role not in _FEE_STAFF:
            raise PermissionDenied("Only school staff can view outstanding fees.")
        _require_school(request.user)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        fee_structures = FeeStructure.objects.filter(school_id=request.user.school_id)
        outstanding_data = []

        for fee in fee_structures:
            # One DB round-trip per fee structure instead of one per user
            paid_map = {
                row['payer_id']: row['total']
                for row in Payment.objects.filter(
                    school_id=request.user.school_id,
                    fee_structure=fee,
                    status='confirmed',
                ).values('payer_id').annotate(total=Sum('amount'))
            }
            pending_map = {
                row['payer_id']: row['total']
                for row in Payment.objects.filter(
                    school_id=request.user.school_id,
                    fee_structure=fee,
                    status='pending',
                ).values('payer_id').annotate(total=Sum('amount'))
            }

            for user in User.objects.filter(
                school_id=request.user.school_id, role=fee.role, is_active=True
            ):
                total_paid = paid_map.get(user.id, Decimal('0.00'))
                if total_paid >= fee.amount:
                    continue
                outstanding_data.append({
                    'user_id': str(user.id),
                    'user_name': user.get_full_name(),
                    'fee_name': fee.name,
                    'total_owed': float(fee.amount),
                    'total_paid': float(total_paid),
                    'pending_amount': float(pending_map.get(user.id, Decimal('0.00'))),
                    'compliance_percentage': round(float(total_paid / fee.amount * 100), 2) if fee.amount > 0 else 0,
                })

        return Response(outstanding_data)

    @action(detail=True, methods=['get'])
    def generate_receipt(self, request, pk=None):
        """Returns receipt data for a confirmed payment."""
        payment = self.get_object()

        if payment.status != 'confirmed':
            return Response({'error': 'Only confirmed payments have receipts.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invoice = payment.invoice
        except Invoice.DoesNotExist:
            return Response({'error': 'Receipt not found for this payment.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'receipt_number': payment.receipt_number,
            'invoice_number': invoice.invoice_number,
            'payment_date': payment.payment_date,
            'payer_name': payment.payer.get_full_name(),
            'payer_email': payment.payer.email,
            'amount': float(payment.amount),
            'currency': payment.currency,
            'fee_description': payment.fee_structure.name if payment.fee_structure else 'General Payment',
            'payment_method': payment.get_payment_method_display(),
            'school_name': payment.school.name,
            'school_address': payment.school.address,
        })


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related('payment__payer', 'payment__school', 'issued_by')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related('payment__payer', 'payment__school', 'issued_by')
        if user.role in _FEE_STAFF and user.school_id:
            return qs.filter(payment__school_id=user.school_id)
        if user.role in ['STUDENT', 'PARENT']:
            return qs.filter(payment__payer=user)
        return qs.none()
