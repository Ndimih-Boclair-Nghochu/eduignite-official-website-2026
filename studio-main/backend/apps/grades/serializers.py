from rest_framework import serializers
from decimal import Decimal
from .models import Subject, Sequence, Grade, TermResult, AnnualResult
from apps.students.serializers import StudentListSerializer


class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'school', 'name', 'code', 'level', 'coefficient', 'teacher', 'teacher_name', 'is_active']
        read_only_fields = ['id']


class SequenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sequence
        fields = ['id', 'school', 'name', 'academic_year', 'term', 'start_date', 'end_date', 'is_active']
        read_only_fields = ['id']


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_admission = serializers.CharField(source='student.admission_number', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    grade_letter = serializers.SerializerMethodField()
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)

    class Meta:
        model = Grade
        fields = [
            'id', 'student', 'student_name', 'student_admission', 'subject', 'subject_name',
            'subject_code', 'sequence', 'score', 'grade_letter', 'teacher', 'teacher_name',
            'comment', 'created', 'modified'
        ]
        read_only_fields = ['id', 'created', 'modified']

    def get_grade_letter(self, obj):
        return obj.get_grade_letter()


class GradeBulkCreateSerializer(serializers.Serializer):
    sequence_id = serializers.UUIDField()
    grades = GradeSerializer(many=True)

    def validate_grades(self, value):
        if not value:
            raise serializers.ValidationError("At least one grade is required.")
        return value

    def create(self, validated_data):
        sequence_id = validated_data['sequence_id']
        grades_data = validated_data['grades']

        try:
            sequence = Sequence.objects.get(id=sequence_id)
        except Sequence.DoesNotExist:
            raise serializers.ValidationError("Sequence not found.")

        grades = []
        for grade_data in grades_data:
            grade = Grade.objects.create(
                sequence=sequence,
                **grade_data
            )
            grades.append(grade)
        return grades


class TermResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_admission = serializers.CharField(source='student.admission_number', read_only=True)

    class Meta:
        model = TermResult
        fields = [
            'id', 'student', 'student_name', 'student_admission', 'school', 'academic_year',
            'term', 'average', 'rank', 'total_students', 'is_promoted', 'teacher_comment', 'created'
        ]
        read_only_fields = ['id', 'rank', 'created']


class AnnualResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_admission = serializers.CharField(source='student.admission_number', read_only=True)

    class Meta:
        model = AnnualResult
        fields = [
            'id', 'student', 'student_name', 'student_admission', 'school', 'academic_year',
            'annual_average', 'rank', 'is_on_honour_roll', 'is_promoted', 'created'
        ]
        read_only_fields = ['id', 'rank', 'created']


class ReportCardSerializer(serializers.Serializer):
    student = StudentListSerializer()
    sequence = SequenceSerializer()
    grades = GradeSerializer(many=True)
    average = serializers.DecimalField(max_digits=5, decimal_places=2)
    rank = serializers.IntegerField()
    total_students = serializers.IntegerField()
    promotion_status = serializers.CharField()
