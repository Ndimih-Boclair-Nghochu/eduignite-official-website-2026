from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import AIRequest, AIInsight


class AIRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)

    class Meta:
        model = AIRequest
        fields = [
            'id', 'user', 'user_name', 'school', 'request_type', 'request_type_display',
            'prompt', 'response', 'model_used', 'tokens_used', 'status', 'status_display',
            'error_message', 'processing_time_ms', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'response', 'tokens_used', 'status', 'error_message',
            'processing_time_ms', 'created_at', 'updated_at'
        ]


class AIRequestCreateSerializer(serializers.ModelSerializer):
    context_data = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = AIRequest
        fields = ['request_type', 'prompt', 'context_data']

    def validate_prompt(self, value):
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError(
                _('Prompt must be at least 10 characters long.')
            )
        return value

    def create(self, validated_data):
        validated_data.pop('context_data', None)
        validated_data['status'] = 'pending'
        return super().create(validated_data)


class StudyPlanRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    subjects = serializers.ListField(
        child=serializers.CharField(),
        required=True
    )
    weeks = serializers.IntegerField(min_value=1, max_value=52, default=4)

    def validate_subjects(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError(_('At least one subject is required.'))
        return value


class GradeAnalysisRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    sequence_id = serializers.IntegerField(required=False, allow_null=True)


class AttendanceInsightRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField(required=False, allow_null=True)
    class_name = serializers.CharField(required=False, allow_blank=True)
    days = serializers.IntegerField(min_value=1, max_value=365, default=30)

    def validate(self, data):
        if not data.get('student_id') and not data.get('class_name'):
            raise serializers.ValidationError(
                _('Either student_id or class_name must be provided.')
            )
        return data


class ExamPrepRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    subject_id = serializers.IntegerField()
    exam_date = serializers.DateField(required=False, allow_null=True)


class ParentReportRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()


class AIInsightSerializer(serializers.ModelSerializer):
    insight_type_display = serializers.CharField(source='get_insight_type_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    target_roles = serializers.SerializerMethodField()

    class Meta:
        model = AIInsight
        fields = [
            'id', 'school', 'insight_type', 'insight_type_display', 'title',
            'description', 'data', 'target_role', 'target_roles', 'expires_at',
            'is_active', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_expired', 'target_roles'
        ]

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_target_roles(self, obj):
        return obj.get_target_roles()
