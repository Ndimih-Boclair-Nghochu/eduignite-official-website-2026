from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.students.models import Student

from .models import Assignment, AssignmentSubmission
from .serializers import (
    AssignmentSerializer,
    AssignmentSubmissionGradeSerializer,
    AssignmentSubmissionSerializer,
)


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.select_related('school', 'subject', 'teacher')
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Assignment.objects.select_related('school', 'subject', 'teacher')

        if user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            queryset = queryset.filter(school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(
                school=user.school
            ).filter(Q(teacher=user) | Q(subject__teacher=user))
        elif user.role == 'STUDENT':
            try:
                student = Student.objects.get(user=user)
            except Student.DoesNotExist:
                return queryset.none()
            queryset = queryset.filter(
                school=user.school,
                target_class=student.student_class,
                status=Assignment.Status.PUBLISHED,
            )
        else:
            queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied('Only school staff can create assignments.')

        teacher = serializer.validated_data.get('teacher')
        subject = serializer.validated_data.get('subject')
        if user.role == 'TEACHER':
            teacher = user
        elif teacher is None and subject and subject.teacher:
            teacher = subject.teacher

        serializer.save(
            school=user.school,
            teacher=teacher,
        )

    def perform_update(self, serializer):
        if self.request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied('Only school staff can update assignments.')
        self._ensure_can_manage(self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_can_manage(instance)
        instance.delete()

    def _ensure_can_manage(self, assignment: Assignment):
        user = self.request.user
        if user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            return
        if user.role == 'TEACHER' and (assignment.teacher_id == user.id or assignment.subject.teacher_id == user.id):
            return
        raise PermissionDenied('You are not allowed to manage this assignment.')


class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    queryset = AssignmentSubmission.objects.select_related(
        'assignment', 'assignment__subject', 'assignment__teacher', 'student', 'student__user', 'graded_by'
    )
    serializer_class = AssignmentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = AssignmentSubmission.objects.select_related(
            'assignment', 'assignment__subject', 'assignment__teacher', 'student', 'student__user', 'graded_by'
        )

        assignment_id = self.request.query_params.get('assignment')
        if assignment_id:
            queryset = queryset.filter(assignment_id=assignment_id)

        if user.role in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            queryset = queryset.filter(assignment__school=user.school)
        elif user.role == 'TEACHER':
            queryset = queryset.filter(
                assignment__school=user.school
            ).filter(Q(assignment__teacher=user) | Q(assignment__subject__teacher=user))
        elif user.role == 'STUDENT':
            queryset = queryset.filter(student__user=user)
        else:
            queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != 'STUDENT':
            raise PermissionDenied('Only students can submit assignment work.')

        try:
            student = Student.objects.get(user=self.request.user)
        except Student.DoesNotExist:
            raise ValidationError('Student profile not found.')

        assignment = serializer.validated_data['assignment']
        if assignment.school_id != student.school_id:
            raise PermissionDenied('This assignment does not belong to your school.')
        if assignment.target_class != student.student_class:
            raise PermissionDenied('This assignment is not assigned to your class.')
        if assignment.status != Assignment.Status.PUBLISHED:
            raise ValidationError('This assignment is not open for submissions.')

        serializer.save(student=student, status=AssignmentSubmission.Status.SUBMITTED)

    def perform_update(self, serializer):
        submission = self.get_object()
        if self.request.user.role != 'STUDENT' or submission.student.user_id != self.request.user.id:
            raise PermissionDenied('Only the owning student can update this submission.')
        serializer.save(status=AssignmentSubmission.Status.SUBMITTED)

    @action(detail=False, methods=['get'])
    def my_submissions(self, request):
        if request.user.role != 'STUDENT':
            raise PermissionDenied('Only students can view their own submissions.')
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def grade(self, request, pk=None):
        submission = self.get_object()
        user = request.user
        if user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied('Only school staff can grade submissions.')
        if user.role == 'TEACHER' and not (
            submission.assignment.teacher_id == user.id or submission.assignment.subject.teacher_id == user.id
        ):
            raise PermissionDenied('You are not allowed to grade this submission.')

        serializer = AssignmentSubmissionGradeSerializer(
            data=request.data,
            context={'submission': submission, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AssignmentSubmissionSerializer(submission).data, status=status.HTTP_200_OK)

