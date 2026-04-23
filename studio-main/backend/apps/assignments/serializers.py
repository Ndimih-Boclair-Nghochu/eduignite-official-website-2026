from django.utils import timezone
from rest_framework import serializers

from .models import Assignment, AssignmentSubmission


class AssignmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)

    class Meta:
        model = Assignment
        fields = [
            'id',
            'school',
            'subject',
            'subject_name',
            'subject_code',
            'teacher',
            'teacher_name',
            'title',
            'instructions',
            'target_class',
            'due_date',
            'max_marks',
            'submission_type',
            'status',
            'created',
            'modified',
        ]
        read_only_fields = ['id', 'created', 'modified', 'school']

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        school = getattr(user, 'school', None)
        subject = attrs.get('subject') or getattr(self.instance, 'subject', None)
        teacher = attrs.get('teacher') or getattr(self.instance, 'teacher', None)

        if school and subject and subject.school_id != school.id:
            raise serializers.ValidationError({'subject': 'This subject does not belong to your school.'})

        if school and teacher and teacher.school_id != school.id:
            raise serializers.ValidationError({'teacher': 'Assigned teacher must belong to your school.'})

        return attrs


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_admission = serializers.CharField(source='student.admission_number', read_only=True)
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)
    assignment_max_marks = serializers.DecimalField(source='assignment.max_marks', max_digits=5, decimal_places=2, read_only=True)
    subject_name = serializers.CharField(source='assignment.subject.name', read_only=True)
    target_class = serializers.CharField(source='assignment.target_class', read_only=True)
    graded_by_name = serializers.CharField(source='graded_by.get_full_name', read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id',
            'assignment',
            'assignment_title',
            'assignment_max_marks',
            'subject_name',
            'target_class',
            'student',
            'student_name',
            'student_admission',
            'content',
            'attachment_name',
            'attachment_data',
            'status',
            'score',
            'feedback',
            'graded_by',
            'graded_by_name',
            'graded_at',
            'created',
            'modified',
        ]
        read_only_fields = [
            'id',
            'student',
            'status',
            'graded_by',
            'graded_at',
            'created',
            'modified',
        ]

    def validate(self, attrs):
        assignment = attrs.get('assignment') or getattr(self.instance, 'assignment', None)
        content = attrs.get('content', getattr(self.instance, 'content', ''))
        attachment_data = attrs.get('attachment_data', getattr(self.instance, 'attachment_data', ''))

        if assignment:
            if assignment.submission_type == Assignment.SubmissionType.TEXT and not content:
                raise serializers.ValidationError({'content': 'A written response is required for this assignment.'})
            if assignment.submission_type == Assignment.SubmissionType.FILE and not attachment_data:
                raise serializers.ValidationError({'attachment_data': 'A file attachment is required for this assignment.'})
            if assignment.submission_type == Assignment.SubmissionType.BOTH and not content and not attachment_data:
                raise serializers.ValidationError('Submit written content or an attachment before sending.')

        return attrs


class AssignmentSubmissionGradeSerializer(serializers.Serializer):
    score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    feedback = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        submission = self.context['submission']
        if attrs['score'] > submission.assignment.max_marks:
            raise serializers.ValidationError({'score': 'The score cannot exceed the assignment maximum marks.'})
        return attrs

    def save(self, **kwargs):
        submission = self.context['submission']
        user = self.context['request'].user
        submission.score = self.validated_data['score']
        submission.feedback = self.validated_data.get('feedback', '')
        submission.status = AssignmentSubmission.Status.GRADED
        submission.graded_by = user
        submission.graded_at = timezone.now()
        submission.save(update_fields=['score', 'feedback', 'status', 'graded_by', 'graded_at', 'modified'])
        return submission
