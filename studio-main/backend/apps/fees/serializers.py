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

    class Meta:
        model = Payment
        fields = [
            'id', 'reference_number', 'payer', 'payer_name', 'fee_name', 'amount',
            'currency', 'payment_method', 'status', 'payment_date', 'created'
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
    class Meta:
        model = Payment
        fields = [
            'payer', 'fee_structure', 'amount', 'currency', 'payment_method',
            'payment_date', 'notes'
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def create(self, validated_data):
        # Bursar is set by the view
        return Payment.objects.create(**validated_data)


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
