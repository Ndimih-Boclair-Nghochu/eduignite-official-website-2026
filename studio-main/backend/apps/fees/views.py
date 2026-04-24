from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Q, Count
from django.utils import timezone
from decimal import Decimal

from .models import FeeStructure, Payment, Invoice
from .serializers import (
    FeeStructureSerializer, PaymentListSerializer, PaymentDetailSerializer,
    PaymentCreateSerializer, PaymentConfirmSerializer, InvoiceSerializer,
    RevenueReportSerializer, FeeComplianceSerializer
)
from .utils import generate_reference_number, generate_receipt_number, generate_invoice_number


class FeeStructureViewSet(viewsets.ModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = FeeStructure.objects.all()

        if user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']:
            queryset = queryset.filter(school=user.school)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can create fee structures.")

        request.data['school'] = request.user.school.id
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can update fee structures.")
        return super().update(request, *args, **kwargs)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('payer', 'fee_structure', 'bursar')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        elif self.action == 'retrieve':
            return PaymentDetailSerializer
        elif self.action in ['confirm', 'reject']:
            return PaymentConfirmSerializer
        return PaymentListSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related('payer', 'fee_structure', 'bursar')

        if user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'STUDENT':
            queryset = queryset.filter(payer=user)
        elif user.role == 'PARENT':
            queryset = queryset.filter(payer=user)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        is_staff_payment = request.user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']
        payer = serializer.validated_data.get('payer') or request.user
        fee_structure = serializer.validated_data.get('fee_structure')
        mark_license_paid = serializer.validated_data.get('mark_license_paid', False)
        is_self_service_license_payment = (
            not is_staff_payment
            and request.user.is_authenticated
            and payer == request.user
            and request.user.school_id is not None
            and fee_structure is None
            and mark_license_paid
        )

        if not is_staff_payment and not is_self_service_license_payment:
            raise PermissionDenied("Only bursars and administrators can record school fee payments.")

        payment = serializer.save(
            school=request.user.school,
            bursar=request.user if is_staff_payment else None,
            reference_number=generate_reference_number()
        )

        if is_self_service_license_payment:
            payment.status = 'confirmed'
            payment.confirmed_at = timezone.now()
            payment.receipt_number = generate_receipt_number()
            payment.notes = payment.notes or 'Self-service platform license payment'
            payment.save(update_fields=['status', 'confirmed_at', 'receipt_number', 'notes', 'modified'])
            Invoice.objects.get_or_create(
                payment=payment,
                defaults={
                    'invoice_number': generate_invoice_number(),
                    'issued_by': None,
                }
            )

        return Response(
            PaymentDetailSerializer(payment).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Bursar confirms payment and generates receipt"""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']:
            raise PermissionDenied("Only bursars and administrators can confirm payments.")

        payment = self.get_object()

        if payment.status != 'pending':
            return Response(
                {'error': f'Payment is already {payment.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PaymentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Generate receipt and confirm payment
        receipt_number = serializer.validated_data.get('receipt_number', generate_receipt_number())

        payment.status = 'confirmed'
        payment.confirmed_at = timezone.now()
        payment.receipt_number = receipt_number
        payment.save()

        # Create invoice
        invoice = Invoice.objects.create(
            payment=payment,
            invoice_number=generate_invoice_number(),
            issued_by=request.user
        )

        return Response(
            {
                'payment': PaymentDetailSerializer(payment).data,
                'invoice': InvoiceSerializer(invoice).data,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a payment with reason"""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']:
            raise PermissionDenied("Only bursars and administrators can reject payments.")

        payment = self.get_object()

        if payment.status != 'pending':
            return Response(
                {'error': f'Only pending payments can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        payment.status = 'rejected'
        payment.notes = reason
        payment.save()

        return Response(
            PaymentDetailSerializer(payment).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def my_payments(self, request):
        """Current user's payment history"""
        queryset = self.get_queryset().filter(payer=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def revenue_report(self, request):
        """Total revenue by period, method, fee type"""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']:
            raise PermissionDenied("Only school staff can view revenue reports.")

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = Payment.objects.filter(school=request.user.school, status='confirmed')

        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)

        total_collected = queryset.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        total_pending = Payment.objects.filter(
            school=request.user.school,
            status='pending'
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        total_rejected = Payment.objects.filter(
            school=request.user.school,
            status='rejected'
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        # By payment method
        by_method = {}
        for method, _ in Payment.PAYMENT_METHOD_CHOICES:
            amount = queryset.filter(payment_method=method).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
            by_method[method] = float(amount)

        # By fee type
        by_fee_type = {}
        for fee in queryset.values('fee_structure__name').annotate(total=Sum('amount')):
            if fee['fee_structure__name']:
                by_fee_type[fee['fee_structure__name']] = float(fee['total'])

        period = f"{start_date or 'All'} to {end_date or 'All'}"

        data = {
            'total_collected': float(total_collected),
            'total_pending': float(total_pending),
            'total_rejected': float(total_rejected),
            'period': period,
            'by_method': by_method,
            'by_fee_type': by_fee_type,
            'payment_count': queryset.count(),
        }

        serializer = RevenueReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def outstanding_fees(self, request):
        """Users who haven't paid"""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']:
            raise PermissionDenied("Only school staff can view outstanding fees.")

        # Get all users in school who should pay fees
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Get fee structures for school
        fee_structures = FeeStructure.objects.filter(school=request.user.school)

        outstanding_data = []

        for fee in fee_structures:
            users = User.objects.filter(school=request.user.school, role=fee.role)

            for user in users:
                # Check if user has paid this fee
                has_paid = Payment.objects.filter(
                    payer=user,
                    fee_structure=fee,
                    status='confirmed'
                ).exists()

                if not has_paid:
                    total_owed = fee.amount
                    total_paid = Payment.objects.filter(
                        payer=user,
                        fee_structure=fee,
                        status='confirmed'
                    ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

                    outstanding_data.append({
                        'user_id': str(user.id),
                        'user_name': user.get_full_name(),
                        'total_owed': float(total_owed),
                        'total_paid': float(total_paid),
                        'pending_payments': Payment.objects.filter(payer=user, fee_structure=fee, status='pending').count(),
                        'paid_payments': Payment.objects.filter(payer=user, fee_structure=fee, status='confirmed').count(),
                        'compliance_percentage': float(total_paid / total_owed * 100) if total_owed > 0 else 0,
                    })

        return Response(outstanding_data)

    @action(detail=True, methods=['get'])
    def generate_receipt(self, request, pk=None):
        """Returns receipt data"""
        payment = self.get_object()

        if payment.status != 'confirmed':
            return Response(
                {'error': 'Only confirmed payments have receipts.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            invoice = payment.invoice
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Receipt not found for this payment.'},
                status=status.HTTP_404_NOT_FOUND
            )

        data = {
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
            'school_address': payment.school.address if hasattr(payment.school, 'address') else '',
        }

        return Response(data)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related('payment', 'issued_by')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Invoice.objects.select_related('payment', 'issued_by')

        if user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'BURSAR']:
            queryset = queryset.filter(payment__school=user.school)
        elif user.role in ['STUDENT', 'PARENT']:
            queryset = queryset.filter(payment__payer=user)
        else:
            queryset = queryset.none()

        return queryset
