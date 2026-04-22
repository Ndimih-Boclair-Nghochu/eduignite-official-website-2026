from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
import re
from .models import School, SchoolSettings

User = get_user_model()


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'School List Item',
            value={
                'id': 'GBHS-D',
                'name': 'Government Bilingual High School Douala',
                'short_name': 'GBHS-D',
                'location': 'Douala',
                'status': 'Active',
                'student_count': 450,
                'teacher_count': 35,
                'logo': 'https://example.com/logos/gbhs-d.jpg',
            },
        ),
    ]
)
class SchoolListSerializer(serializers.ModelSerializer):
    """Serializer for school list view."""

    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'short_name',
            'principal',
            'email',
            'phone',
            'location',
            'status',
            'student_count',
            'teacher_count',
            'logo',
            'matricule',
        ]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'School Detail',
            value={
                'id': 'GBHS-D',
                'name': 'Government Bilingual High School Douala',
                'short_name': 'GBHS-D',
                'principal': 'Mr. John Nkongho',
                'motto': 'Excellence and Integrity',
                'logo': 'https://example.com/logos/gbhs-d.jpg',
                'banner': 'https://example.com/banners/gbhs-d.jpg',
                'description': 'A leading secondary school in Douala',
                'location': 'Douala',
                'region': 'Littoral',
                'division': 'Douala Division',
                'sub_division': 'Douala',
                'city_village': 'Douala',
                'address': 'Akwa District',
                'postal_code': '00237',
                'phone': '+237670123456',
                'email': 'gbhs@example.com',
                'status': 'Active',
                'founded_year': 1995,
                'student_count': 450,
                'teacher_count': 35,
                'settings': {
                    'licence_expiry': '2025-12-31',
                    'max_students': 500,
                    'max_teachers': 50,
                    'academic_year': '2024-2025',
                    'term': 'First',
                    'allow_ai_features': True,
                    'ai_request_limit': 1000,
                },
            },
        ),
    ]
)
class SchoolDetailSerializer(serializers.ModelSerializer):
    """Serializer for school detail view with settings."""

    settings = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'short_name',
            'principal',
            'motto',
            'logo',
            'banner',
            'description',
            'location',
            'region',
            'division',
            'sub_division',
            'city_village',
            'address',
            'postal_code',
            'phone',
            'email',
            'status',
            'founded_year',
            'student_count',
            'teacher_count',
            'matricule',
            'settings',
            'created_at',
            'updated_at',
        ]

    def get_settings(self, obj):
        """Return school settings if they exist."""
        try:
            settings = obj.settings
            return SchoolSettingsSerializer(settings).data
        except SchoolSettings.DoesNotExist:
            return None


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Create School',
            value={
                'id': 'GBHS-D',
                'name': 'Government Bilingual High School Douala',
                'short_name': 'GBHS-D',
                'principal': 'Mr. John Nkongho',
                'location': 'Douala',
                'region': 'Littoral',
                'division': 'Douala Division',
                'sub_division': 'Douala',
                'city_village': 'Douala',
                'address': 'Akwa District',
                'phone': '+237670123456',
                'email': 'gbhs@example.com',
            },
        ),
    ]
)
class SchoolCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating schools with validation.

    ``matricule`` is auto-generated from the school name and returned in
    the response so the principal can use it to activate the school account.
    ``id`` is optional: when omitted it falls back to the uppercased short_name.
    """

    matricule = serializers.CharField(read_only=True)
    phone = serializers.CharField(max_length=20)

    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'short_name',
            'principal',
            'motto',
            'logo',
            'banner',
            'description',
            'location',
            'region',
            'division',
            'sub_division',
            'city_village',
            'address',
            'postal_code',
            'phone',
            'email',
            'status',
            'founded_year',
            'matricule',
        ]
        extra_kwargs = {
            'id': {'required': False, 'allow_blank': True},
        }

    def validate_id(self, value):
        """Validate and normalise the optional school ID."""
        if value:
            value = re.sub(r'[^A-Za-z0-9_-]+', '-', value.strip().upper()).strip('-')
        if value and len(value) > 50:
            raise serializers.ValidationError('School ID cannot exceed 50 characters.')
        return value

    def validate(self, attrs):
        # Auto-derive id from short_name when not supplied
        if not attrs.get('id'):
            short_name = attrs.get('short_name', '')
            raw_id = short_name.strip() or attrs['name'][:50]
            attrs['id'] = re.sub(r'[^A-Za-z0-9_-]+', '-', raw_id.upper()).strip('-')
        if attrs.get('short_name'):
            attrs['short_name'] = attrs['short_name'].strip().upper()
        if attrs.get('phone'):
            attrs['phone'] = re.sub(r'[\s().-]+', '', attrs['phone'].strip())
        email = attrs.get('email')
        duplicate_user = User.objects.filter(email=email).first() if email else None
        if duplicate_user and not (
            duplicate_user.role == 'SCHOOL_ADMIN'
            and not duplicate_user.school_id
        ):
            raise serializers.ValidationError(
                {'email': 'This email is already used by another account.'}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        school = School.objects.create(**validated_data)

        principal_user = User.objects.filter(email=school.email).first()
        if principal_user:
            principal_user.matricule = school.matricule
            principal_user.name = school.principal
            principal_user.role = 'SCHOOL_ADMIN'
            principal_user.school = school
            principal_user.is_active = True
            principal_user.set_password('!pending_activation')
            principal_user.save(update_fields=['matricule', 'name', 'role', 'school', 'is_active', 'password'])
        else:
            principal_user = User.objects.create_user(
                matricule=school.matricule,
                name=school.principal,
                email=school.email,
                role='SCHOOL_ADMIN',
                password='!pending_activation',
                school=school,
                is_active=True,
                is_license_paid=False,
            )

        school.principal_user = principal_user
        school.save(update_fields=['principal_user'])

        SchoolSettings.objects.get_or_create(school=school)
        return school


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Update School',
            value={
                'name': 'Government Bilingual High School Douala',
                'principal': 'Mr. John Nkongho',
                'status': 'Active',
            },
        ),
    ]
)
class SchoolUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating schools."""

    phone = serializers.CharField(max_length=20, required=False)

    class Meta:
        model = School
        fields = [
            'name',
            'short_name',
            'principal',
            'motto',
            'logo',
            'banner',
            'description',
            'location',
            'region',
            'division',
            'sub_division',
            'city_village',
            'address',
            'postal_code',
            'phone',
            'email',
            'status',
            'founded_year',
        ]

    def validate_email(self, value):
        school = self.instance
        principal_user_id = getattr(school.principal_user, 'id', None) if school else None
        duplicate_user = User.objects.filter(email=value)
        if principal_user_id:
            duplicate_user = duplicate_user.exclude(id=principal_user_id)
        if duplicate_user.exists():
            raise serializers.ValidationError('This email is already used by another account.')
        return value

    def validate_phone(self, value):
        return re.sub(r'[\s().-]+', '', value.strip()) if value else value

    @transaction.atomic
    def update(self, instance, validated_data):
        school = super().update(instance, validated_data)
        principal_user = school.principal_user

        if principal_user:
            updated_fields = []

            if principal_user.name != school.principal:
                principal_user.name = school.principal
                updated_fields.append('name')

            if principal_user.email != school.email:
                principal_user.email = school.email
                updated_fields.append('email')

            if principal_user.school_id != school.id:
                principal_user.school = school
                updated_fields.append('school')

            if updated_fields:
                principal_user.save(update_fields=updated_fields)

        SchoolSettings.objects.get_or_create(school=school)
        return school


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'School Settings',
            value={
                'licence_expiry': '2025-12-31',
                'max_students': 500,
                'max_teachers': 50,
                'academic_year': '2024-2025',
                'term': 'First',
                'allow_ai_features': True,
                'ai_request_limit': 1000,
            },
        ),
    ]
)
class SchoolSettingsSerializer(serializers.ModelSerializer):
    """Serializer for school settings."""

    class Meta:
        model = SchoolSettings
        fields = [
            'school',
            'licence_expiry',
            'max_students',
            'max_teachers',
            'academic_year',
            'term',
            'allow_ai_features',
            'ai_request_limit',
            'sections',
            'class_levels',
            'departments',
            'streams',
        ]
