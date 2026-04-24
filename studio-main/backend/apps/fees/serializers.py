from rest_framework import serializers
from .models import FeeStructure, Payment, Invoice


class FeeStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeStructure
        fields = [
            'id', 'school', 'name', 'role', 'amount', 'currency', 'academic_year',
            'due_date', 'is_mandatory', 'description', 'created'
        ]
        read_only_fields = ['id', 'created']


class InvoiceSerializer(serializers.ModelSerializer):
    payment_reference = serializers.CharField(source='payment.reference_number', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'payment', 'payment_reference', 'invoice_number', 'issued_at',
            'issued_by', 'pdf_file'
        ]
        read_only_fields = ['id', 'invoice_number', 'issued_at']


class PaymentListSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer.get_full_name', read_only=True)
    fee_name = serializers.CharField(source='fee_structure.name', read_only=True, allow_null=True)
    bursar_name = serializers.CharField(source='bursar.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'reference_number', 'payer', 'payer_name', 'fee_name', 'amount',
            'currency', 'payment_method', 'status', 'payment_date', 'created', 'bursar_name'
        ]
        read_only_fields = ['id', 'reference_number', 'created']


class PaymentDetailSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer.get_full_name', read_only=True)
    bursar_name = serializers.CharField(source='bursar.get_full_name', read_only=True, allow_null=True)
    fee_structure_detail = FeeStructureSerializer(source='fee_structure', read_only=True)
    invoice = InvoiceSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'reference_number', 'payer', 'payer_name', 'fee_structure', 'fee_structure_detail',
            'bursar', 'bursar_name', 'amount', 'currency', 'payment_method', 'status',
            'payment_date', 'confirmed_at', 'receipt_number', 'notes', 'invoice', 'created', 'modified'
        ]
        read_only_fields = ['id', 'reference_number', 'confirmed_at', 'receipt_number', 'created', 'modified']


class PaymentCreateSerializer(serializers.ModelSerializer):
    license_beneficiary = serializers.PrimaryKeyRelatedField(
        queryset=None,
        required=False,
        allow_null=True,
        write_only=True,
    )
    mark_license_paid = serializers.BooleanField(required=False, default=False, write_only=True)

    class Meta:
        model = Payment
        fields = [
            'payer', 'fee_structure', 'amount', 'currency', 'payment_method',
            'payment_date', 'notes', 'license_beneficiary', 'mark_license_paid'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.fields['license_beneficiary'].queryset = User.objects.filter(role='STUDENT')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate(self, attrs):
        beneficiary = attrs.get('license_beneficiary')
        should_mark_paid = attrs.get('mark_license_paid')
        payer = attrs.get('payer')
        request = self.context.get('request')
        requester_school = getattr(getattr(request, 'user', None), 'school', None)

        if not payer and request and request.user.is_authenticated:
            attrs['payer'] = request.user
            payer = request.user

        if beneficiary and requester_school and beneficiary.school_id != requester_school.id:
            raise serializers.ValidationError({'license_beneficiary': 'The selected student must belong to your school.'})

        if should_mark_paid and not beneficiary:
            attrs['license_beneficiary'] = payer

        beneficiary = attrs.get('license_beneficiary')
        if attrs.get('mark_license_paid') and beneficiary and beneficiary.role != 'STUDENT':
            raise serializers.ValidationError({'license_beneficiary': 'Platform charge payments can only be attached to student accounts.'})
        return attrs

    def create(self, validated_data):
        # Bursar is set by the view
        beneficiary = validated_data.pop('license_beneficiary', None)
        should_mark_paid = validated_data.pop('mark_license_paid', False)
        payment = Payment.objects.create(**validated_data)
        if should_mark_paid and beneficiary:
            beneficiary.is_license_paid = True
            beneficiary.save(update_fields=['is_license_paid'])
        return payment


class PaymentConfirmSerializer(serializers.Serializer):
    receipt_number = serializers.CharField(max_length=100, required=False)
    confirmation_notes = serializers.CharField(max_length=500, required=False)

    def validate_receipt_number(self, value):
        if Invoice.objects.filter(payment__receipt_number=value).exists():
            raise serializers.ValidationError("This receipt number is already in use.")
        return value


class RevenueReportSerializer(serializers.Serializer):
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_pending = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_rejected = serializers.DecimalField(max_digits=12, decimal_places=2)
    period = serializers.CharField()
    by_method = serializers.DictField(child=serializers.DecimalField(max_digits=12, decimal_places=2))
    by_fee_type = serializers.DictField(child=serializers.DecimalField(max_digits=12, decimal_places=2))
    payment_count = serializers.IntegerField()


class FeeComplianceSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    user_name = serializers.CharField()
    total_owed = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payments = serializers.IntegerField()
    paid_payments = serializers.IntegerField()
    compliance_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
