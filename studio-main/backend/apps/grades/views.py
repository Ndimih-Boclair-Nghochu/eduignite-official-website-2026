from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from decimal import Decimal

from .models import Subject, Sequence, Grade, TermResult, AnnualResult
from .serializers import (
    SubjectSerializer, SequenceSerializer, GradeSerializer, GradeBulkCreateSerializer,
    TermResultSerializer, AnnualResultSerializer, ReportCardSerializer
)
from .utils import (
    calculate_sequence_average, calculate_term_average, calculate_annual_average,
    compute_rank, generate_report_card_data
)

SCHOOL_ADMIN_ROLES = ['SCHOOL_ADMIN', 'SUB_ADMIN']
SCHOOL_STAFF_ROLES = ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN']


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related('teacher')
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Subject.objects.select_related('teacher')

        if user.role in SCHOOL_ADMIN_ROLES:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(school=user.school)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role not in SCHOOL_ADMIN_ROLES:
            raise PermissionDenied("Only school administrators can create subjects.")

        data = request.data.copy()
        data['school'] = request.user.school.id
        request._full_data = data
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in SCHOOL_ADMIN_ROLES:
            raise PermissionDenied("Only school administrators can update subjects.")
        return super().update(request, *args, **kwargs)


class SequenceViewSet(viewsets.ModelViewSet):
    queryset = Sequence.objects.all()
    serializer_class = SequenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Sequence.objects.all()

        if user.role in SCHOOL_STAFF_ROLES and user.school_id:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'STUDENT' and user.school_id:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'PARENT':
            from apps.students.models import ParentStudentLink
            school_ids = ParentStudentLink.objects.filter(parent=user).values_list('student__school_id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role not in SCHOOL_ADMIN_ROLES:
            raise PermissionDenied("Only school administrators can create sequences.")

        data = request.data.copy()
        data['school'] = request.user.school.id
        request._full_data = data
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in SCHOOL_ADMIN_ROLES:
            raise PermissionDenied("Only school administrators can update sequences.")
        return super().update(request, *args, **kwargs)


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.select_related('student', 'subject', 'sequence', 'teacher')
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Grade.objects.select_related('student', 'subject', 'sequence', 'teacher')

        if user.role == 'TEACHER':
            queryset = queryset.filter(teacher=user)
        elif user.role in SCHOOL_ADMIN_ROLES:
            queryset = queryset.filter(school=user.school)
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
            raise PermissionDenied("Only teachers can create grades.")

        request.data['teacher'] = request.user.id
        request.data['school'] = request.user.school.id
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['TEACHER', *SCHOOL_ADMIN_ROLES]:
            raise PermissionDenied("Only teachers and administrators can update grades.")
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Batch entry of grades for entire class"""
        if request.user.role != 'TEACHER':
            raise PermissionDenied("Only teachers can create grades.")

        serializer = GradeBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grades = serializer.save()

        return Response(
            GradeSerializer(grades, many=True).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def report_card(self, request):
        """Full report card for a student in a sequence"""
        student_id = request.query_params.get('student_id')
        sequence_id = request.query_params.get('sequence_id')

        if not student_id or not sequence_id:
            return Response(
                {'error': 'student_id and sequence_id query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.students.models import Student
        try:
            student = Student.objects.get(id=student_id)
            sequence = Sequence.objects.get(id=sequence_id)
        except (Student.DoesNotExist, Sequence.DoesNotExist):
            return Response(
                {'error': 'Student or Sequence not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permissions
        if request.user.role == 'STUDENT':
            if student.user != request.user:
                raise PermissionDenied("You can only view your own report card.")
        elif request.user.role == 'PARENT':
            from apps.students.models import ParentStudentLink
            if not ParentStudentLink.objects.filter(parent=request.user, student=student).exists():
                raise PermissionDenied("You can only view report cards for your linked children.")
        elif request.user.role == 'TEACHER':
            if student.school_id != request.user.school_id or sequence.school_id != request.user.school_id:
                raise PermissionDenied("You can only view report cards in your school.")
        elif request.user.role in SCHOOL_ADMIN_ROLES:
            if student.school_id != request.user.school_id or sequence.school_id != request.user.school_id:
                raise PermissionDenied("You can only view report cards in your school.")
        else:
            raise PermissionDenied("Insufficient permissions to view report card.")

        data = generate_report_card_data(student, sequence)
        return Response(data)

    @action(detail=False, methods=['get'])
    def class_results(self, request):
        """All student results for a class in a sequence"""
        class_name = request.query_params.get('class_name')
        sequence_id = request.query_params.get('sequence_id')

        if not class_name or not sequence_id:
            return Response(
                {'error': 'class_name and sequence_id query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.role not in [*SCHOOL_ADMIN_ROLES, 'TEACHER']:
            raise PermissionDenied("Only school staff can view class results.")

        try:
            sequence = Sequence.objects.get(id=sequence_id)
        except Sequence.DoesNotExist:
            return Response(
                {'error': 'Sequence not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        if sequence.school_id != request.user.school_id:
            raise PermissionDenied("You can only view class results in your school.")

        from apps.students.models import Student
        students = Student.objects.filter(
            school=request.user.school,
            student_class=class_name
        ).order_by('user__name')

        results = []
        for student in students:
            avg = calculate_sequence_average(student, sequence)
            rank = compute_rank(student, sequence)
            results.append({
                'student_name': student.user.get_full_name(),
                'admission_number': student.admission_number,
                'average': float(avg),
                'rank': rank,
            })

        return Response(results)

    @action(detail=False, methods=['get'])
    def subject_performance(self, request):
        """Analytics per subject"""
        sequence_id = request.query_params.get('sequence_id')

        if not sequence_id:
            return Response(
                {'error': 'sequence_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.role not in [*SCHOOL_ADMIN_ROLES, 'TEACHER']:
            raise PermissionDenied("Only school staff can view subject analytics.")

        try:
            sequence = Sequence.objects.get(id=sequence_id)
        except Sequence.DoesNotExist:
            return Response(
                {'error': 'Sequence not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        if sequence.school_id != request.user.school_id:
            raise PermissionDenied("You can only view subject analytics in your school.")

        from apps.grades.models import Subject
        subjects = Subject.objects.filter(school=request.user.school).prefetch_related('grades')

        analytics = []
        for subject in subjects:
            grades = subject.grades.filter(sequence=sequence)
            if grades.exists():
                avg = grades.aggregate(Avg('score'))['score__avg']
                analytics.append({
                    'subject_name': subject.name,
                    'subject_code': subject.code,
                    'average': float(avg) if avg else 0,
                    'student_count': grades.values('student').distinct().count(),
                })

        return Response(analytics)


class TermResultViewSet(viewsets.ModelViewSet):
    queryset = TermResult.objects.select_related('student', 'school')
    serializer_class = TermResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = TermResult.objects.select_related('student', 'school')

        if user.role in SCHOOL_ADMIN_ROLES:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(school=user.school)
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
        if request.user.role not in SCHOOL_ADMIN_ROLES:
            raise PermissionDenied("Only school administrators can create term results.")
        return super().create(request, *args, **kwargs)


class AnnualResultViewSet(viewsets.ModelViewSet):
    queryset = AnnualResult.objects.select_related('student', 'school')
    serializer_class = AnnualResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = AnnualResult.objects.select_related('student', 'school')

        if user.role in SCHOOL_ADMIN_ROLES:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(school=user.school)
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
        if request.user.role not in SCHOOL_ADMIN_ROLES:
            raise PermissionDenied("Only school administrators can create annual results.")
        return super().create(request, *args, **kwargs)
