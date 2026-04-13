import re
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator


# Words to skip when building the school name abbreviation
_SKIP_WORDS = {
    'a', 'an', 'the', 'of', 'and', 'or', 'in', 'at', 'by', 'for',
    'to', 'du', 'de', 'des', 'le', 'la', 'les', 'et', 'ou',
}


def _generate_school_abbreviation(name: str, max_chars: int = 8) -> str:
    """Return an uppercase abbreviation for a school name.

    Strips punctuation, skips common filler words, and takes the first
    letter of each remaining word.  Result is capped at *max_chars*.
    """
    words = re.sub(r'[^a-zA-Z0-9\s]', '', name).split()
    initials = ''.join(
        w[0].upper()
        for w in words
        if w.lower() not in _SKIP_WORDS and w
    )
    return initials[:max_chars] or name[:max_chars].upper().replace(' ', '')


def generate_school_matricule(school_name: str) -> str:
    """Generate a unique, human-readable matricule from *school_name*.

    Format: ``SCH-<ABBREV>-<NNNN>`` where *ABBREV* is derived from the
    school name and *NNNN* is a zero-padded sequential counter.
    """
    abbrev = _generate_school_abbreviation(school_name)
    prefix = f'SCH-{abbrev}-'

    # Find the highest existing counter with this prefix
    last = (
        School.objects.filter(matricule__startswith=prefix)
        .order_by('-matricule')
        .values_list('matricule', flat=True)
        .first()
    )
    if last:
        try:
            counter = int(last.rsplit('-', 1)[-1]) + 1
        except (ValueError, IndexError):
            counter = 1
    else:
        counter = 1

    return f'{prefix}{counter:04d}'


class TimeStampedModel(models.Model):
    """Abstract base model with timestamp fields."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SchoolStatus(models.TextChoices):
    """School operational status."""
    ACTIVE = 'Active', 'Active'
    SUSPENDED = 'Suspended', 'Suspended'
    PENDING = 'Pending', 'Pending'


class School(TimeStampedModel):
    """School model for EduIgnite platform."""

    id = models.CharField(
        max_length=50,
        primary_key=True,
        verbose_name='School ID',
        help_text='e.g., GBHS-D',
    )
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=50)
    principal = models.CharField(max_length=255)
    principal_user = models.OneToOneField(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='school_principal',
    )
    motto = models.CharField(max_length=255, blank=True)
    logo = models.URLField(max_length=2000, null=True, blank=True)
    banner = models.URLField(max_length=2000, null=True, blank=True)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255)
    region = models.CharField(
        max_length=100,
        choices=[
            ('Littoral', 'Littoral'),
            ('Centre', 'Centre'),
            ('East', 'East'),
            ('North', 'North'),
            ('South', 'South'),
            ('West', 'West'),
            ('Northwest', 'Northwest'),
            ('Southwest', 'Southwest'),
            ('South-West', 'South-West'),
            ('North-West', 'North-West'),
        ],
    )
    division = models.CharField(max_length=100)
    sub_division = models.CharField(max_length=100)
    city_village = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    postal_code = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Enter a valid phone number',
            ),
        ],
    )
    email = models.EmailField()
    status = models.CharField(
        max_length=20,
        choices=SchoolStatus.choices,
        default=SchoolStatus.PENDING,
    )
    founded_year = models.IntegerField(null=True, blank=True)
    student_count = models.IntegerField(default=0)
    teacher_count = models.IntegerField(default=0)
    matricule = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        help_text='Auto-generated activation matricule based on school name.',
    )

    class Meta:
        verbose_name = 'School'
        verbose_name_plural = 'Schools'
        db_table = 'schools'
        ordering = ['name']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['region']),
        ]

    def save(self, *args, **kwargs):
        if not self.matricule and self.name:
            self.matricule = generate_school_matricule(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.id})'

    def update_student_count(self):
        """Update cached student count from users."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.student_count = User.objects.filter(
            school=self,
            role='STUDENT',
        ).count()
        self.save(update_fields=['student_count'])

    def update_teacher_count(self):
        """Update cached teacher count from users."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.teacher_count = User.objects.filter(
            school=self,
            role='TEACHER',
        ).count()
        self.save(update_fields=['teacher_count'])


class SchoolSettings(models.Model):
    """Settings for individual schools."""

    school = models.OneToOneField(School, on_delete=models.CASCADE, related_name='settings')
    licence_expiry = models.DateField(null=True, blank=True)
    max_students = models.IntegerField(default=500)
    max_teachers = models.IntegerField(default=50)
    academic_year = models.CharField(
        max_length=20,
        default='2024-2025',
        help_text='e.g., 2024-2025',
    )
    term = models.CharField(
        max_length=20,
        choices=[
            ('First', 'First Term'),
            ('Second', 'Second Term'),
            ('Third', 'Third Term'),
        ],
        default='First',
    )
    allow_ai_features = models.BooleanField(default=True)
    ai_request_limit = models.IntegerField(default=1000)

    class Meta:
        verbose_name = 'School Settings'
        verbose_name_plural = 'School Settings'
        db_table = 'school_settings'

    def __str__(self):
        return f'{self.school.name} Settings'
