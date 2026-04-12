import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import RegexValidator


class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
    CEO = 'CEO', 'Chief Executive Officer'
    CTO = 'CTO', 'Chief Technology Officer'
    COO = 'COO', 'Chief Operations Officer'
    INV = 'INV', 'Investor'
    DESIGNER = 'DESIGNER', 'Designer'
    SCHOOL_ADMIN = 'SCHOOL_ADMIN', 'School Administrator'
    SUB_ADMIN = 'SUB_ADMIN', 'Sub Administrator'
    TEACHER = 'TEACHER', 'Teacher'
    STUDENT = 'STUDENT', 'Student'
    PARENT = 'PARENT', 'Parent'
    BURSAR = 'BURSAR', 'Bursar'
    LIBRARIAN = 'LIBRARIAN', 'Librarian'


class UserManager(BaseUserManager):
    """Custom user manager for User model."""

    def create_user(self, matricule, name, email, role, password=None, **extra_fields):
        """Create and save a regular user."""
        if not matricule:
            raise ValueError('The Matricule field must be set')
        if not email:
            raise ValueError('The Email field must be set')
        if not role:
            raise ValueError('The Role field must be set')

        email = self.normalize_email(email)
        user = self.model(
            matricule=matricule,
            name=name,
            email=email,
            role=role,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, matricule, name, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', UserRole.SUPER_ADMIN)

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True')

        return self.create_user(matricule, name, email, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model for EduIgnite platform."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uid = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        verbose_name='Firebase UID',
    )
    matricule = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name='Matricule',
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, db_index=True)
    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Enter a valid phone number',
            ),
        ],
    )
    whatsapp = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Enter a valid WhatsApp number',
            ),
        ],
    )
    role = models.CharField(
        max_length=50,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
        db_index=True,
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )
    avatar = models.URLField(max_length=2000, null=True, blank=True)
    is_license_paid = models.BooleanField(default=False)
    ai_request_count = models.IntegerField(default=0)
    annual_avg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Annual Average',
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'matricule'
    REQUIRED_FIELDS = ['name', 'email', 'role']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        db_table = 'users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['matricule']),
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['school']),
        ]

    def __str__(self):
        return f'{self.matricule} - {self.name}'

    def get_full_name(self):
        return self.name

    def get_short_name(self):
        return self.name.split()[0] if self.name else self.matricule

    @property
    def is_platform_executive(self):
        """Check if user is a platform executive."""
        executive_roles = [
            UserRole.SUPER_ADMIN,
            UserRole.CEO,
            UserRole.CTO,
            UserRole.COO,
        ]
        return self.role in executive_roles

    @property
    def is_school_admin(self):
        """Check if user is a school administrator."""
        admin_roles = [UserRole.SCHOOL_ADMIN, UserRole.SUB_ADMIN]
        return self.role in admin_roles

    @property
    def is_school_staff(self):
        """Check if user is school staff (non-executive)."""
        staff_roles = [
            UserRole.TEACHER,
            UserRole.BURSAR,
            UserRole.LIBRARIAN,
            UserRole.SCHOOL_ADMIN,
            UserRole.SUB_ADMIN,
        ]
        return self.role in staff_roles

    @property
    def display_role(self):
        """Get human-readable role name."""
        return self.get_role_display()

    def save(self, *args, **kwargs):
        """Override save to handle special cases."""
        if self.is_platform_executive:
            self.is_staff = True
        super().save(*args, **kwargs)


class FounderProfile(models.Model):
    """Founder board profile with share ownership metadata."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='founder_profile',
    )
    founder_title = models.CharField(max_length=255)
    primary_share_percentage = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_primary_founder = models.BooleanField(default=False)
    can_be_removed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'founder_profiles'
        ordering = ['-is_primary_founder', 'user__date_joined']
        indexes = [
            models.Index(fields=['is_primary_founder']),
            models.Index(fields=['can_be_removed']),
        ]

    def __str__(self):
        return f'{self.user.name} Founder Profile'

    @property
    def additional_share_percentage(self):
        total = self.share_adjustments.aggregate(total=models.Sum('percentage')).get('total')
        return total or Decimal('0.00')

    @property
    def total_share_percentage(self):
        return (self.primary_share_percentage or Decimal('0.00')) + self.additional_share_percentage


class FounderShareAdjustment(models.Model):
    """Incremental share allocations granted over time."""

    founder = models.ForeignKey(
        FounderProfile,
        on_delete=models.CASCADE,
        related_name='share_adjustments',
    )
    percentage = models.DecimalField(max_digits=6, decimal_places=2)
    note = models.CharField(max_length=255, blank=True)
    added_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='founder_share_adjustments_added',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'founder_share_adjustments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['founder', 'created_at']),
        ]

    def __str__(self):
        return f'{self.founder.user.name} +{self.percentage}%'
