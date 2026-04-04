from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django_extensions.db.models import TimeStampedModel
import uuid


class Subject(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    level = models.CharField(max_length=50, help_text='Class level this subject is offered in')
    coefficient = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    teacher = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='taught_subjects',
                                limit_choices_to={'role': 'TEACHER'})
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        unique_together = [['school', 'code']]
        indexes = [
            models.Index(fields=['school', 'level']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Sequence(models.Model):
    TERM_CHOICES = [
        (1, 'Term 1'),
        (2, 'Term 2'),
        (3, 'Term 3'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='sequences')
    name = models.CharField(max_length=255, help_text='e.g., Sequence 1, Sequence 2')
    academic_year = models.CharField(max_length=20, help_text='e.g., 2024-2025')
    term = models.IntegerField(choices=TERM_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year', 'term', 'name']
        unique_together = [['school', 'academic_year', 'term', 'name']]
        indexes = [
            models.Index(fields=['school', 'academic_year', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} - {self.academic_year} (Term {self.term})"


class Grade(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='grades')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='grades')
    sequence = models.ForeignKey(Sequence, on_delete=models.CASCADE, related_name='grades')
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='grades')
    score = models.DecimalField(max_digits=5, decimal_places=2,
                                validators=[MinValueValidator(0), MaxValueValidator(20)])
    teacher = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True,
                                related_name='entered_grades',
                                limit_choices_to={'role': 'TEACHER'})
    comment = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-sequence__academic_year', '-sequence__term', 'subject__name']
        unique_together = [['student', 'subject', 'sequence']]
        indexes = [
            models.Index(fields=['student', 'sequence']),
            models.Index(fields=['subject', 'sequence']),
        ]

    def __str__(self):
        return f"{self.student.admission_number} - {self.subject.code} ({self.sequence.name}): {self.score}"

    def get_grade_letter(self):
        """Convert numerical score to letter grade (Cameroon scale)"""
        if self.score >= 16:
            return 'A'
        elif self.score >= 14:
            return 'B'
        elif self.score >= 12:
            return 'C'
        elif self.score >= 10:
            return 'D'
        else:
            return 'F'


class TermResult(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='term_results')
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='term_results')
    academic_year = models.CharField(max_length=20)
    term = models.IntegerField(choices=[(1, 'Term 1'), (2, 'Term 2'), (3, 'Term 3')])
    average = models.DecimalField(max_digits=5, decimal_places=2,
                                  validators=[MinValueValidator(0), MaxValueValidator(20)])
    rank = models.IntegerField(null=True, blank=True)
    total_students = models.IntegerField(default=0)
    is_promoted = models.BooleanField(null=True, blank=True)
    teacher_comment = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-academic_year', '-term']
        unique_together = [['student', 'academic_year', 'term']]
        indexes = [
            models.Index(fields=['student', 'academic_year']),
        ]

    def __str__(self):
        return f"{self.student.admission_number} - Term {self.term} {self.academic_year}: {self.average}"


class AnnualResult(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='annual_results')
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='annual_results')
    academic_year = models.CharField(max_length=20)
    annual_average = models.DecimalField(max_digits=5, decimal_places=2,
                                         validators=[MinValueValidator(0), MaxValueValidator(20)])
    rank = models.IntegerField(null=True, blank=True)
    is_on_honour_roll = models.BooleanField(default=False)
    is_promoted = models.BooleanField()

    class Meta:
        ordering = ['-academic_year', '-annual_average']
        unique_together = [['student', 'academic_year']]
        indexes = [
            models.Index(fields=['student', 'academic_year']),
            models.Index(fields=['school', 'academic_year']),
        ]

    def __str__(self):
        return f"{self.student.admission_number} - {self.academic_year}: {self.annual_average}"
