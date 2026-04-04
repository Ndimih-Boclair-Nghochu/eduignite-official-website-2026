from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import AttendanceSession, AttendanceRecord, TeacherAttendance
from .serializers import (
    AttendanceSessionSerializer, AttendanceRecordSerializer, BulkAttendanceSerializer,
    AttendanceSummarySerializer, TeacherAttendanceSerializer, ClassAttendanceReportSerializer
)


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    queryset = AttendanceSession.objects.select_related('teacher', 'subject', 'school')
    serializer_class = AttendanceSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = AttendanceSession.objects.select_related('teacher', 'subject', 'school').prefetch_related('records')

        if user.role == 'TEACHER':
            queryset = queryset.filter(teacher=user)
        elif user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            queryset = queryset.filter(school=user.school)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role != 'TEACHER':
            raise PermissionDenied("Only teachers can create attendance sessions.")

        request.data['teacher'] = request.user.id
        request.data['school'] = request.user.school.id
        return super().create(request, *args, **kwargs)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related('session', 'student')
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = AttendanceRecord.objects.select_related('session', 'student')

        if user.role == 'TEACHER':
            queryset = queryset.filter(session__teacher=user)
        elif user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            queryset = queryset.filter(session__school=user.school)
        elif user.role == 'STUDENT':
            queryset = queryset.filter(student__user=user)
        elif user.role == 'PARENT':
            from apps.students.models import ParentStudentLink
            linked_students = ParentStudentLink.objects.filter(parent=user).values_list('student_id', flat=True)
            queryset = queryset.filter(student_id__in=linked_students)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role != 'TEACHER':
            raise PermissionDenied("Only teachers can create attendance records.")
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def bulk_record(self, request):
        """Teacher records entire class at once"""
        if request.user.role != 'TEACHER':
            raise PermissionDenied("Only teachers can record attendance.")

        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session, records = serializer.save()

        return Response({
            'session': AttendanceSessionSerializer(session).data,
            'records': AttendanceRecordSerializer(records, many=True).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def my_attendance(self, request):
        """Student sees own attendance"""
        if request.user.role != 'STUDENT':
            raise PermissionDenied("Only students can view their own attendance.")

        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        records = self.get_queryset().filter(student=student).order_by('-session__date')
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def student_summary(self, request):
        """Attendance summary per student"""
        student_id = request.query_params.get('student_id')

        if not student_id:
            return Response(
                {'error': 'student_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.students.models import Student
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check permissions
        if request.user.role == 'STUDENT':
            if student.user != request.user:
                raise PermissionDenied("You can only view your own attendance summary.")
        elif request.user.role == 'PARENT':
            from apps.students.models import ParentStudentLink
            if not ParentStudentLink.objects.filter(parent=request.user, student=student).exists():
                raise PermissionDenied("You can only view attendance for your linked children.")
        elif request.user.role not in ['TEACHER', 'SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Insufficient permissions.")

        records = AttendanceRecord.objects.filter(student=student)
        total_days = records.count()
        present_days = records.filter(status='present').count()
        absent_days = records.filter(status='absent').count()
        late_days = records.filter(status='late').count()
        excused_days = records.filter(status='excused').count()

        attendance_percentage = Decimal('0.00')
        if total_days > 0:
            attendance_percentage = Decimal(present_days + late_days) / Decimal(total_days) * 100
            attendance_percentage = attendance_percentage.quantize(Decimal('0.01'))

        data = {
            'student_id': str(student.id),
            'student_name': student.user.get_full_name(),
            'student_admission': student.admission_number,
            'total_days': total_days,
            'present_days': present_days,
            'absent_days': absent_days,
            'late_days': late_days,
            'excused_days': excused_days,
            'attendance_percentage': float(attendance_percentage),
        }
        serializer = AttendanceSummarySerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def class_report(self, request):
        """Date-range report for a class"""
        class_name = request.query_params.get('class_name')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not class_name:
            return Response(
                {'error': 'class_name query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied("Only school staff can view class reports.")

        sessions = AttendanceSession.objects.filter(student_class=class_name)

        if start_date:
            sessions = sessions.filter(date__gte=start_date)
        if end_date:
            sessions = sessions.filter(date__lte=end_date)

        records = AttendanceRecord.objects.filter(session__in=sessions).select_related('session', 'student')

        data = []
        for record in records:
            data.append({
                'date': record.session.date,
                'period': record.session.period,
                'student_name': record.student.user.get_full_name(),
                'admission_number': record.student.admission_number,
                'status': record.status,
            })

        serializer = ClassAttendanceReportSerializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def absent_students_today(self, request):
        """List of absent students for today"""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied("Only school staff can view this information.")

        today = timezone.now().date()
        sessions = AttendanceSession.objects.filter(date=today, school=request.user.school)
        absent_records = AttendanceRecord.objects.filter(
            session__in=sessions,
            status='absent'
        ).select_related('student', 'session')

        data = []
        for record in absent_records:
            data.append({
                'student_name': record.student.user.get_full_name(),
                'admission_number': record.student.admission_number,
                'class': record.student.student_class,
                'period': record.session.period,
                'parent_notified': record.notified_parent,
            })

        return Response(data)


class TeacherAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TeacherAttendance.objects.select_related('teacher', 'noted_by', 'school')
    serializer_class = TeacherAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = TeacherAttendance.objects.select_related('teacher', 'noted_by', 'school')

        if user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(teacher=user)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can record teacher attendance.")

        request.data['school'] = request.user.school.id
        request.data['noted_by'] = request.user.id
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can update teacher attendance.")
        return super().update(request, *args, **kwargs)
