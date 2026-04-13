from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
from datetime import timedelta
import uuid

from .models import FounderProfile, FounderShareAdjustment, FounderAccessLevel

User = get_user_model()

FOUNDER_MANAGEABLE_ROLES = [
    'SUPER_ADMIN',
    'COO',
    'INV',
    'DESIGNER',
]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'User List Item',
            value={
                'id': '550e8400-e29b-41d4-a716-446655440000',
                'matricule': 'STU001',
                'name': 'Example Student',
                'email': 'student@example.com',
                'role': 'STUDENT',
                'school_name': 'Example Secondary School',
                'avatar': 'https://example.com/avatars/user1.jpg',
                'is_license_paid': True,
                'is_active': True,
            },
        ),
    ]
)
class UserListSerializer(serializers.ModelSerializer):
    """Serializer for user list view."""

    school_name = serializers.CharField(source='school.name', read_only=True)
    is_platform_executive = serializers.BooleanField(read_only=True)
    is_school_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'matricule',
            'name',
            'email',
            'role',
            'school_name',
            'avatar',
            'is_license_paid',
            'is_active',
            'is_platform_executive',
            'is_school_admin',
        ]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'User Detail',
            value={
                'id': '550e8400-e29b-41d4-a716-446655440000',
                'matricule': 'STU001',
                'name': 'Example Student',
                'email': 'student@example.com',
                'phone': '+237670123456',
                'whatsapp': '+237670123456',
                'role': 'STUDENT',
                'school': {
                    'id': 'SCH-001',
                    'name': 'Example Secondary School',
                    'location': 'City Center',
                },
                'avatar': 'https://example.com/avatars/user1.jpg',
                'is_license_paid': True,
                'ai_request_count': 45,
                'annual_avg': '16.50',
                'is_active': True,
                'date_joined': '2024-01-15T10:30:00Z',
                'display_role': 'Student',
            },
        ),
    ]
)
class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for user detail view with full information."""

    school = serializers.SerializerMethodField()
    display_role = serializers.CharField(source='get_role_display', read_only=True)
    is_platform_executive = serializers.BooleanField(read_only=True)
    is_school_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'matricule',
            'uid',
            'name',
            'email',
            'phone',
            'whatsapp',
            'role',
            'school',
            'avatar',
            'is_license_paid',
            'ai_request_count',
            'annual_avg',
            'is_active',
            'date_joined',
            'display_role',
            'is_platform_executive',
            'is_school_admin',
        ]

    def get_school(self, obj):
        """Return school basic info if user has school."""
        if obj.school:
            return {
                'id': obj.school.id,
                'name': obj.school.name,
                'location': obj.school.location,
            }
        return None


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Create User',
            value={
                'name': 'Jane Smith',
                'email': 'jane@example.com',
                'phone': '+237670987654',
                'role': 'TEACHER',
                'school': 'GBHS-D',
                'password': 'SecurePassword123!',
            },
        ),
    ]
)
class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'name',
            'email',
            'phone',
            'whatsapp',
            'role',
            'school',
            'password',
            'password_confirm',
        ]

    def validate(self, data):
        """Validate password confirmation."""
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        """Create user with auto-generated matricule."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        matricule = self._generate_unique_matricule()

        user = User.objects.create_user(
            matricule=matricule,
            password=password,
            **validated_data,
        )
        return user

    def _generate_unique_matricule(self):
        """Generate unique matricule."""
        while True:
            matricule = f'USR{uuid.uuid4().hex[:8].upper()}'
            if not User.objects.filter(matricule=matricule).exists():
                return matricule


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Update User',
            value={
                'name': 'Jane Smith Updated',
                'phone': '+237670987654',
                'whatsapp': '+237670987654',
                'is_active': True,
            },
        ),
    ]
)
class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user details (limited fields)."""

    class Meta:
        model = User
        fields = [
            'name',
            'phone',
            'whatsapp',
            'avatar',
            'is_active',
        ]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Update Role',
            value={
                'role': 'TEACHER',
            },
        ),
    ]
)
class UserRoleUpdateSerializer(serializers.ModelSerializer):
    """Serializer for executives to change user roles."""

    class Meta:
        model = User
        fields = ['role']


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Toggle License',
            value={
                'is_license_paid': True,
            },
        ),
    ]
)
class LicenseToggleSerializer(serializers.ModelSerializer):
    """Serializer for toggling license payment status."""

    class Meta:
        model = User
        fields = ['is_license_paid']


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Profile Update',
            value={
                'name': 'John Updated',
                'phone': '+237670123456',
                'whatsapp': '+237670123456',
            },
        ),
    ]
)
class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for users to update their own profile."""

    email = serializers.EmailField(required=False)

    class Meta:
        model = User
        fields = [
            'name',
            'phone',
            'whatsapp',
            'avatar',
            'email',
        ]

    def validate_email(self, value):
        user = self.instance
        if user and User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value


class FounderShareAdjustmentSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source='added_by.name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()

    class Meta:
        model = FounderShareAdjustment
        fields = [
            'id',
            'percentage',
            'note',
            'expires_at',
            'is_expired',
            'is_locked',
            'days_until_expiry',
            'created_at',
            'added_by_name',
        ]

    def get_is_expired(self, obj):
        return obj.is_expired

    def get_is_locked(self, obj):
        return obj.is_locked

    def get_days_until_expiry(self, obj):
        return obj.days_until_expiry


class FounderProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    matricule = serializers.CharField(source='user.matricule', read_only=True)
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    whatsapp = serializers.CharField(source='user.whatsapp', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    avatar = serializers.URLField(source='user.avatar', read_only=True, allow_null=True)
    additional_share_percentage = serializers.SerializerMethodField()
    total_share_percentage = serializers.SerializerMethodField()
    is_share_expired = serializers.SerializerMethodField()
    days_until_share_expiry = serializers.SerializerMethodField()
    share_adjustments = FounderShareAdjustmentSerializer(many=True, read_only=True)

    class Meta:
        model = FounderProfile
        fields = [
            'id',
            'user_id',
            'matricule',
            'name',
            'email',
            'phone',
            'whatsapp',
            'role',
            'avatar',
            'founder_title',
            'primary_share_percentage',
            'additional_share_percentage',
            'total_share_percentage',
            'is_primary_founder',
            'can_be_removed',
            'is_active',
            # Renewable shares
            'has_renewable_shares',
            'share_renewal_period_days',
            'shares_expire_at',
            'is_share_expired',
            'days_until_share_expiry',
            # Access level
            'access_level',
            'share_adjustments',
            'created_at',
            'updated_at',
        ]

    def get_additional_share_percentage(self, obj):
        return f'{obj.additional_share_percentage:.2f}'

    def get_total_share_percentage(self, obj):
        return f'{obj.total_share_percentage:.2f}'

    def get_is_share_expired(self, obj):
        return obj.is_share_expired

    def get_days_until_share_expiry(self, obj):
        return obj.days_until_share_expiry


class FounderProfileCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=FOUNDER_MANAGEABLE_ROLES)
    founder_title = serializers.CharField(max_length=255)
    primary_share_percentage = serializers.DecimalField(max_digits=6, decimal_places=2)

    # Renewable shares governance (CEO/CTO decision)
    has_renewable_shares = serializers.BooleanField(default=False)
    share_renewal_period_days = serializers.IntegerField(
        min_value=1,
        default=365,
        required=False,
        help_text='Days in the renewal period. Required when has_renewable_shares=True.',
    )

    # Activity permission level
    access_level = serializers.ChoiceField(
        choices=[c[0] for c in FounderAccessLevel.choices],
        default=FounderAccessLevel.FULL,
    )

    def validate_primary_share_percentage(self, value):
        if value <= 0:
            raise serializers.ValidationError('Primary share percentage must be greater than zero.')
        return value

    def validate(self, data):
        if data.get('has_renewable_shares') and not data.get('share_renewal_period_days'):
            raise serializers.ValidationError(
                {'share_renewal_period_days': 'Renewal period in days is required when has_renewable_shares is True.'}
            )
        return data

    def create(self, validated_data):
        has_renewable = validated_data.get('has_renewable_shares', False)
        renewal_days = validated_data.get('share_renewal_period_days', 365)
        shares_expire_at = None
        if has_renewable:
            shares_expire_at = timezone.now() + timedelta(days=renewal_days)

        matricule = self._generate_founder_matricule(validated_data['role'])
        user = User.objects.create_user(
            matricule=matricule,
            name=validated_data['name'],
            email=validated_data['email'],
            phone=validated_data['phone'],
            whatsapp=validated_data.get('whatsapp') or validated_data['phone'],
            role=validated_data['role'],
            password='!pending_activation',
            is_active=True,
            is_license_paid=True,
        )
        profile = FounderProfile.objects.create(
            user=user,
            founder_title=validated_data['founder_title'],
            primary_share_percentage=validated_data['primary_share_percentage'],
            is_primary_founder=False,
            can_be_removed=True,
            has_renewable_shares=has_renewable,
            share_renewal_period_days=renewal_days,
            shares_expire_at=shares_expire_at,
            access_level=validated_data.get('access_level', FounderAccessLevel.FULL),
        )
        return profile

    def _generate_founder_matricule(self, role):
        prefix_map = {
            'SUPER_ADMIN': 'SUP',
            'COO': 'COO',
            'INV': 'INV',
            'DESIGNER': 'DSN',
        }
        prefix = prefix_map.get(role, 'FND')
        counter = 1
        while True:
            matricule = f'EDU-FND-{prefix}-{counter:04d}'
            if not User.objects.filter(matricule=matricule).exists():
                return matricule
            counter += 1


class FounderProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=20, required=False)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=FOUNDER_MANAGEABLE_ROLES, required=False)
    founder_title = serializers.CharField(max_length=255, required=False)
    primary_share_percentage = serializers.DecimalField(max_digits=6, decimal_places=2, required=False)
    is_active = serializers.BooleanField(required=False)
    access_level = serializers.ChoiceField(
        choices=[c[0] for c in FounderAccessLevel.choices],
        required=False,
    )

    def validate_primary_share_percentage(self, value):
        if value <= 0:
            raise serializers.ValidationError('Primary share percentage must be greater than zero.')
        return value

    def update(self, instance, validated_data):
        user = instance.user

        if instance.is_primary_founder and 'role' in validated_data:
            raise serializers.ValidationError({'role': 'Primary founder roles cannot be changed.'})
        if instance.is_primary_founder and 'primary_share_percentage' in validated_data:
            raise serializers.ValidationError({'primary_share_percentage': 'Primary founder shares are fixed. Use additional shares instead.'})

        for field in ['name', 'email', 'phone', 'whatsapp', 'role', 'is_active']:
            if field in validated_data:
                setattr(user, field, validated_data[field])
        user.save()

        if 'founder_title' in validated_data:
            instance.founder_title = validated_data['founder_title']
        if 'primary_share_percentage' in validated_data and not instance.is_primary_founder:
            instance.primary_share_percentage = validated_data['primary_share_percentage']
        if 'access_level' in validated_data:
            instance.access_level = validated_data['access_level']
        instance.save()
        return instance


class FounderShareCreateSerializer(serializers.Serializer):
    percentage = serializers.DecimalField(max_digits=6, decimal_places=2)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)
    duration_days = serializers.IntegerField(
        min_value=1,
        help_text='Number of days until this share allocation expires and is automatically removed.',
    )

    def validate_percentage(self, value):
        if value <= 0:
            raise serializers.ValidationError('Additional share percentage must be greater than zero.')
        return value
