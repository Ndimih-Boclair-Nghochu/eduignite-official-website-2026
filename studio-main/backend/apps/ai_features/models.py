from django.db import models
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField
from core.models import TimeStampedModel


class AIRequest(TimeStampedModel):
    REQUEST_TYPE_CHOICES = [
        ('study_plan', 'Study Plan Generation'),
        ('grade_analysis', 'Grade Analysis'),
        ('attendance_insight', 'Attendance Insight'),
        ('report_summary', 'Report Summary'),
        ('subject_recommendation', 'Subject Recommendation'),
        ('exam_prep', 'Exam Preparation'),
        ('parent_report', 'Parent Report'),
        ('teacher_insight', 'Teacher Insight'),
        ('general', 'General Query'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='ai_requests'
    )
    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='ai_requests'
    )
    request_type = models.CharField(
        max_length=50,
        choices=REQUEST_TYPE_CHOICES
    )
    prompt = models.TextField()
    response = models.TextField(blank=True)
    model_used = models.CharField(
        max_length=100,
        default='llama-3.3-70b-versatile'
    )
    tokens_used = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    error_message = models.TextField(blank=True)
    processing_time_ms = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['school', '-created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['request_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.get_request_type_display()} - {self.user} - {self.status}"

    def mark_completed(self, response, tokens_used=0, processing_time_ms=0):
        """Mark request as completed with response."""
        self.status = 'completed'
        self.response = response
        self.tokens_used = tokens_used
        self.processing_time_ms = processing_time_ms
        self.save(update_fields=['status', 'response', 'tokens_used', 'processing_time_ms', 'updated_at'])

    def mark_failed(self, error_message):
        """Mark request as failed with error message."""
        self.status = 'failed'
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message', 'updated_at'])


class AIInsight(TimeStampedModel):
    INSIGHT_TYPE_CHOICES = [
        ('weekly_performance', 'Weekly Performance'),
        ('attendance_alert', 'Attendance Alert'),
        ('honour_roll_prediction', 'Honour Roll Prediction'),
        ('dropout_risk', 'Dropout Risk'),
    ]

    school = models.ForeignKey(
        'schools.School',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='ai_insights'
    )
    insight_type = models.CharField(
        max_length=50,
        choices=INSIGHT_TYPE_CHOICES
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    data = models.JSONField(default=dict)
    target_role = models.CharField(
        max_length=100,
        help_text='Comma-separated roles that should see this insight (e.g., executive,principal,teacher)'
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['school', 'is_active']),
            models.Index(fields=['insight_type', '-created_at']),
            models.Index(fields=['expires_at', 'is_active']),
        ]

    def __str__(self):
        return f"{self.get_insight_type_display()} - {self.title}"

    def is_expired(self):
        """Check if insight has expired."""
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False

    def get_target_roles(self):
        """Get list of target roles."""
        return [role.strip() for role in self.target_role.split(',')]
