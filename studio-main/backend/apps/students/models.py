from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django_extensions.db.models import TimeStampedModel
import uuid
import qrcode
import base64
from io import BytesIO


class Student(TimeStampedModel):
    CLASS_LEVEL_CHOICES = [
        ('form1', 'Form 1'),
        ('form2', 'Form 2'),
        ('form3', 'Form 3'),
        ('form4', 'Form 4'),
        ('form5', 'Form 5'),
        ('lower_sixth', 'Lower Sixth'),
        ('upper_sixth', 'Upper Sixth'),
    ]

    SECTION_CHOICES = [
        ('general', 'General'),
        ('bilingual', 'Bilingual'),
        ('technical', 'Technical'),
        ('science', 'Science'),
        ('arts', 'Arts'),
        ('commercial', 'Commercial'),
    ]

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='student_profile')
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='students')
    student_class = models.CharField(max_length=100, help_text='e.g., Form 5, Upper Sixth Science')
    class_level = models.CharField(max_length=20, choices=CLASS_LEVEL_CHOICES, default='form1')
    section = models.CharField(max_length=50, choices=SECTION_CHOICES, default='general')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='other')
    guardian_name = models.CharField(max_length=255, blank=True, default='')
    guardian_phone = models.CharField(max_length=20, blank=True, default='')
    guardian_whatsapp = models.CharField(max_length=20, null=True, blank=True)
    admission_number = models.CharField(max_length=50, unique=True, db_index=True)
    admission_date = models.DateField(null=True, blank=True)
    annual_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                         validators=[MinValueValidator(0), MaxValueValidator(20)])
    is_on_honour_roll = models.BooleanField(default=False)
    qr_code = models.URLField(max_length=5000, null=True, blank=True)

    class Meta:
        ordering = ['student_class', 'user__name']
        indexes = [
            models.Index(fields=['school', 'class_level']),
            models.Index(fields=['admission_number']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.admission_number})"

    def generate_qr_code(self):
        """Generate QR code and store as a base64 data URL."""
        qr_data = f"student:{self.admission_number}:{self.user.email}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        encoded = base64.b64encode(buffer.read()).decode('utf-8')
        self.qr_code = f"data:image/png;base64,{encoded}"
        self.save(update_fields=['qr_code'])


class ParentStudentLink(TimeStampedModel):
    RELATIONSHIP_CHOICES = [
        ('father', 'Father'),
        ('mother', 'Mother'),
        ('guardian', 'Guardian'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent = models.ForeignKey('users.User', on_delete=models.CASCADE,
                               related_name='linked_students',
                               limit_choices_to={'role': 'PARENT'})
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='parent_links')
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    is_primary = models.BooleanField(default=False)

    class Meta:
        unique_together = [['parent', 'student']]
        indexes = [
            models.Index(fields=['parent', 'student']),
        ]

    def __str__(self):
        return f"{self.parent.get_full_name()} - {self.student.user.get_full_name()} ({self.relationship})"

    def save(self, *args, **kwargs):
        # Ensure only one primary parent per student
        if self.is_primary:
            ParentStudentLink.objects.filter(student=self.student, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)
