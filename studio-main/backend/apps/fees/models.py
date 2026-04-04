from django.db import models
from django.core.validators import MinValueValidator
from django_extensions.db.models import TimeStampedModel
import uuid
import secrets


class FeeStructure(TimeStampedModel):
    ROLE_CHOICES = [
        ('STUDENT', 'Student'),
        ('PARENT', 'Parent'),
        ('TEACHER', 'Teacher'),
        ('STAFF', 'Staff'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='fee_structures')
    name = models.CharField(max_length=255, help_text='e.g., School Fees 2024-2025, Exam Fees')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default='XAF')
    academic_year = models.CharField(max_length=20)
    due_date = models.DateField(null=True, blank=True)
    is_mandatory = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-academic_year', 'role', 'name']
        unique_together = [['school', 'name', 'academic_year']]
        indexes = [
            models.Index(fields=['school', 'academic_year']),
        ]

    def __str__(self):
        return f"{self.name} - {self.amount} {self.currency}"


class Payment(TimeStampedModel):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('rejected', 'Rejected'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='payments')
    payer = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='payments')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='payments')
    bursar = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='processed_payments',
                               limit_choices_to={'role__in': ['BURSAR', 'SCHOOL_ADMIN']})
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default='XAF')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_number = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_date = models.DateField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    receipt_number = models.CharField(max_length=100, null=True, blank=True, unique=True)

    class Meta:
        ordering = ['-payment_date', '-created']
        indexes = [
            models.Index(fields=['school', 'payment_date']),
            models.Index(fields=['payer', 'status']),
            models.Index(fields=['reference_number']),
        ]

    def __str__(self):
        return f"{self.reference_number} - {self.payer.get_full_name()} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = self._generate_reference_number()
        super().save(*args, **kwargs)

    def _generate_reference_number(self):
        """Generate unique payment reference number"""
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_suffix = secrets.token_hex(3).upper()
        return f"PAY-{timestamp}-{random_suffix}"


class Invoice(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=100, unique=True, db_index=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    issued_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True,
                                  related_name='issued_invoices')
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True)

    class Meta:
        ordering = ['-issued_at']
        indexes = [
            models.Index(fields=['invoice_number']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self._generate_invoice_number()
        super().save(*args, **kwargs)

    def _generate_invoice_number(self):
        """Generate unique invoice number"""
        from django.utils import timezone
        date_str = timezone.now().strftime('%Y%m%d')
        count = Invoice.objects.filter(
            invoice_number__startswith=f"INV-{date_str}"
        ).count()
        return f"INV-{date_str}-{count + 1:05d}"
