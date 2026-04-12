from rest_framework import serializers
from .models import LiveClass, LiveClassEnrollment


class LiveClassSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    teacher_avatar = serializers.URLField(source='teacher.avatar', read_only=True, allow_null=True)
    subject_display = serializers.SerializerMethodField()
    end_time = serializers.DateTimeField(read_only=True)
    is_live_now = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = LiveClass
        fields = [
            'id', 'title', 'description', 'subject', 'subject_name',
            'subject_display', 'teacher', 'teacher_name', 'teacher_avatar',
            'target_class', 'meeting_url', 'meeting_id', 'meeting_password',
            'platform', 'start_time', 'end_time', 'duration_minutes', 'status',
            'is_live_now', 'max_participants', 'enrolled_count',
            'is_recorded', 'recording_url', 'created', 'modified',
        ]
        read_only_fields = ['id', 'enrolled_count', 'created', 'modified', 'status']

    def get_subject_display(self, obj):
        return obj.subject_display

    def validate_start_time(self, value):
        from django.utils import timezone
        # Allow only future sessions (with 5 min grace)
        if value < timezone.now() - timezone.timedelta(minutes=5):
            raise serializers.ValidationError("Start time must be in the future.")
        return value


class LiveClassCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveClass
        fields = [
            'title', 'description', 'subject', 'subject_name',
            'target_class', 'meeting_url', 'meeting_id', 'meeting_password',
            'platform', 'start_time', 'duration_minutes', 'max_participants',
        ]

    def create(self, validated_data):
        request = self.context['request']
        validated_data['teacher'] = request.user
        validated_data['school'] = request.user.school
        return super().create(validated_data)


class LiveClassEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_avatar = serializers.URLField(source='student.avatar', read_only=True, allow_null=True)

    class Meta:
        model = LiveClassEnrollment
        fields = [
            'id', 'live_class', 'student', 'student_name', 'student_avatar',
            'joined_at', 'left_at', 'duration_attended', 'created',
        ]
        read_only_fields = ['id', 'created']
