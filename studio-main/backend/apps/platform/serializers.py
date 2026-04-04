from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample
from .models import PlatformSettings, PlatformFees, PublicEvent, TutorialLink


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Platform Settings',
            value={
                'name': 'EduIgnite',
                'logo': 'https://example.com/logo.png',
                'payment_deadline': '2025-12-31',
                'honour_roll_threshold': '15.00',
                'maintenance_mode': False,
                'contact_email': 'eduignitecmr@gmail.com',
                'contact_phone': '+237670123456',
                'fees': {
                    'STUDENT': 5000,
                    'TEACHER': 10000,
                },
                'tutorial_links': {
                    'STUDENT': 'https://tutorials.eduignite.com/student',
                    'TEACHER': 'https://tutorials.eduignite.com/teacher',
                },
            },
        ),
    ]
)
class PlatformSettingsSerializer(serializers.ModelSerializer):
    """Serializer for platform settings."""

    class Meta:
        model = PlatformSettings
        fields = [
            'name',
            'logo',
            'payment_deadline',
            'honour_roll_threshold',
            'fees',
            'tutorial_links',
            'maintenance_mode',
            'contact_email',
            'contact_phone',
        ]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Platform Fee',
            value={
                'id': 1,
                'role': 'STUDENT',
                'amount': '5000.00',
                'currency': 'XAF',
            },
        ),
    ]
)
class PlatformFeesSerializer(serializers.ModelSerializer):
    """Serializer for platform fees."""

    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = PlatformFees
        fields = [
            'id',
            'role',
            'role_display',
            'amount',
            'currency',
        ]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Public Event',
            value={
                'id': 1,
                'type': 'video',
                'title': 'Back to School 2024',
                'description': 'Our new school year campaign',
                'url': 'https://youtube.com/watch?v=example',
                'is_active': True,
                'order': 1,
                'created_at': '2024-01-15T10:30:00Z',
            },
        ),
    ]
)
class PublicEventSerializer(serializers.ModelSerializer):
    """Serializer for public events."""

    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = PublicEvent
        fields = [
            'id',
            'type',
            'type_display',
            'title',
            'description',
            'url',
            'is_active',
            'order',
            'created_at',
            'updated_at',
        ]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Tutorial Link',
            value={
                'id': 1,
                'role': 'STUDENT',
                'url': 'https://tutorials.eduignite.com/student/getting-started',
                'title': 'Getting Started as a Student',
            },
        ),
    ]
)
class TutorialLinkSerializer(serializers.ModelSerializer):
    """Serializer for tutorial links."""

    class Meta:
        model = TutorialLink
        fields = [
            'id',
            'role',
            'url',
            'title',
        ]
