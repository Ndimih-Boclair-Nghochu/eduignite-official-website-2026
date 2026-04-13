from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
from .models import School, SchoolSettings


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
            'principal_user',
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

    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'short_name',
            'principal',
            'principal_user',
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
        if value and len(value) > 50:
            raise serializers.ValidationError('School ID cannot exceed 50 characters.')
        return value.upper() if value else value

    def validate(self, attrs):
        # Auto-derive id from short_name when not supplied
        if not attrs.get('id'):
            short_name = attrs.get('short_name', '')
            attrs['id'] = short_name.strip().upper() or attrs['name'][:50].upper()
        return attrs


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

    class Meta:
        model = School
        fields = [
            'name',
            'short_name',
            'principal',
            'principal_user',
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
        ]
