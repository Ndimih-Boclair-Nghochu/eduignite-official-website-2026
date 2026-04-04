from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord, TeacherAttendance


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_admission = serializers.CharField(source='student.admission_number', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'session', 'student', 'student_name', 'student_admission',
            'status', 'excuse_note', 'notified_parent', 'created', 'modified'
        ]
        read_only_fields = ['id', 'created', 'modified']


class AttendanceSessionSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    records = AttendanceRecordSerializer(many=True, read_only=True)
    total_present = serializers.SerializerMethodField()
    total_absent = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'school', 'teacher', 'teacher_name', 'subject', 'subject_name',
            'student_class', 'date', 'period', 'notes', 'records',
            'total_present', 'total_absent', 'created', 'modified'
        ]
        read_only_fields = ['id', 'created', 'modified']

    def get_total_present(self, obj):
        return obj.records.filter(status__in=['present', 'late']).count()

    def get_total_absent(self, obj):
        return obj.records.filter(status='absent').count()


class BulkAttendanceSerializer(serializers.Serializer):
    session_data = AttendanceSessionSerializer()
    records = AttendanceRecordSerializer(many=True)

    def validate_records(self, value):
        if not value:
            raise serializers.ValidationError("At least one attendance record is required.")
        return value

    def create(self, validated_data):
        session_data = validated_data['session_data']
        records_data = validated_data['records']

        # Create session
        session = AttendanceSession.objects.create(**session_data)

        # Create records
        records = []
        for record_data in records_data:
            record = AttendanceRecord.objects.create(session=session, **record_data)
            records.append(record)

        return session, records


class AttendanceSummarySerializer(serializers.Serializer):
    student_id = serializers.UUIDField()
    student_name = serializers.CharField()
    student_admission = serializers.CharField()
    total_days = serializers.IntegerField()
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    late_days = serializers.IntegerField()
    excused_days = serializers.IntegerField()
    attendance_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class ClassAttendanceReportSerializer(serializers.Serializer):
    date = serializers.DateField()
    period = serializers.CharField()
    student_name = serializers.CharField()
    admission_number = serializers.CharField()
    status = serializers.CharField()


class TeacherAttendanceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    noted_by_name = serializers.CharField(source='noted_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = TeacherAttendance
        fields = [
            'id', 'school', 'teacher', 'teacher_name', 'date', 'status',
            'check_in_time', 'check_out_time', 'noted_by', 'noted_by_name',
            'created', 'modified'
        ]
        read_only_fields = ['id', 'created', 'modified']
