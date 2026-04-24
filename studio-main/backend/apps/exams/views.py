from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.students.models import ParentStudentLink, Student

from .models import Exam, ExamSubmission
from .serializers import ExamSerializer, ExamSubmissionCreateSerializer, ExamSubmissionSerializer

SCHOOL_ADMIN_ROLES = ['SCHOOL_ADMIN', 'SUB_ADMIN']
SCHOOL_STAFF_ROLES = ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN']


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.select_related('school', 'subject', 'sequence', 'teacher').prefetch_related('questions')
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset

        mode = self.request.query_params.get('mode')
        if mode:
            queryset = queryset.filter(mode=mode)

        if user.role in SCHOOL_ADMIN_ROLES:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(school=user.school).filter(Q(teacher=user) | Q(subject__teacher=user))
        elif user.role == 'STUDENT':
            try:
                student = Student.objects.get(user=user)
            except Student.DoesNotExist:
                return queryset.none()
            queryset = queryset.filter(school=student.school, target_class=student.student_class)
        elif user.role == 'PARENT':
            linked_classes = ParentStudentLink.objects.filter(parent=user).values_list('student__student_class', flat=True)
            school_ids = ParentStudentLink.objects.filter(parent=user).values_list('student__school_id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids, target_class__in=linked_classes)
        else:
            queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [*SCHOOL_ADMIN_ROLES, 'TEACHER']:
            raise PermissionDenied('Only school staff can create exams.')

        teacher = serializer.validated_data.get('teacher')
        if user.role == 'TEACHER':
            teacher = user

        serializer.save(school=user.school, teacher=teacher)

    def perform_update(self, serializer):
        self._ensure_can_manage(self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_can_manage(instance)
        instance.delete()

    def _ensure_can_manage(self, exam: Exam):
        user = self.request.user
        if user.role in SCHOOL_ADMIN_ROLES:
            return
        if user.role == 'TEACHER' and (exam.teacher_id == user.id or exam.subject_id and exam.subject.teacher_id == user.id):
            return
        raise PermissionDenied('You are not allowed to manage this exam.')

    @action(detail=False, methods=['get'])
    def active(self, request):
        queryset = self.get_queryset().filter(mode=Exam.Mode.ONLINE, status=Exam.Status.SCHEDULED)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ExamSubmissionViewSet(viewsets.ModelViewSet):
    queryset = ExamSubmission.objects.select_related(
        'exam', 'exam__subject', 'exam__teacher', 'student', 'student__user'
    ).prefetch_related('exam__questions')
    serializer_class = ExamSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset

        exam_id = self.request.query_params.get('exam')
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)

        if user.role in SCHOOL_ADMIN_ROLES:
            queryset = queryset.filter(exam__school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(exam__school=user.school).filter(
                Q(exam__teacher=user) | Q(exam__subject__teacher=user)
            )
        elif user.role == 'STUDENT':
            queryset = queryset.filter(student__user=user)
        elif user.role == 'PARENT':
            linked_students = ParentStudentLink.objects.filter(parent=user).values_list('student_id', flat=True)
            queryset = queryset.filter(student_id__in=linked_students)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = ExamSubmissionCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        output = ExamSubmissionSerializer(submission, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        raise PermissionDenied('Exam submissions cannot be edited directly.')

    def partial_update(self, request, *args, **kwargs):
        raise PermissionDenied('Exam submissions cannot be edited directly.')

    @action(detail=False, methods=['get'])
    def my_results(self, request):
        if request.user.role != 'STUDENT':
            raise PermissionDenied('Only students can view their exam results.')
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
