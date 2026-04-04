from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
import uuid

User = get_user_model()


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'User List Item',
            value={
                'id': '550e8400-e29b-41d4-a716-446655440000',
                'matricule': 'STU001',
                'name': 'John Doe',
                'email': 'john@example.com',
                'role': 'STUDENT',
                'school_name': 'Government Bilingual High School Douala',
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
        ]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'User Detail',
            value={
                'id': '550e8400-e29b-41d4-a716-446655440000',
                'matricule': 'STU001',
                'name': 'John Doe',
                'email': 'john@example.com',
                'phone': '+237670123456',
                'whatsapp': '+237670123456',
                'role': 'STUDENT',
                'school': {
                    'id': 'GBHS-D',
                    'name': 'Government Bilingual High School Douala',
                    'location': 'Douala',
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

    class Meta:
        model = User
        fields = [
            'name',
            'phone',
            'whatsapp',
            'avatar',
        ]
