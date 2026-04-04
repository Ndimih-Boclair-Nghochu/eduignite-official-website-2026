from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from .models import Student, ParentStudentLink
from .serializers import (
    StudentListSerializer, StudentDetailSerializer, StudentCreateSerializer,
    StudentUpdateSerializer, ParentStudentLinkSerializer, HonourRollSerializer
)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related('user', 'school').prefetch_related('parent_links')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return StudentUpdateSerializer
        elif self.action == 'retrieve':
            return StudentDetailSerializer
        elif self.action == 'honour_roll':
            return HonourRollSerializer
        return StudentListSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.select_related('user', 'school').prefetch_related('parent_links')

        if user.role == 'SCHOOL_ADMIN' or user.role == 'SUB_ADMIN':
            # Admin/Sub-admin sees all students in their school
            queryset = queryset.filter(school=user.school)
        elif user.role == 'TEACHER':
            # Teacher sees students in their school
            queryset = queryset.filter(school=user.school)
        elif user.role == 'PARENT':
            # Parent sees linked children
            linked_students = ParentStudentLink.objects.filter(parent=user).values_list('student_id', flat=True)
            queryset = queryset.filter(id__in=linked_students)
        elif user.role == 'STUDENT':
            # Student sees only self
            queryset = queryset.filter(user=user)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can create students.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can update students.")
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def honour_roll(self, request):
        """Get students on honour roll for the requesting user's school"""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied("Only school staff can view honour roll.")

        school = request.user.school
        honour_roll_threshold = getattr(school, 'honour_roll_threshold', 15.0)

        students = Student.objects.filter(
            school=school,
            annual_average__gte=honour_roll_threshold
        ).order_by('-annual_average')

        serializer = self.get_serializer(students, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_children(self, request):
        """For PARENT role, returns linked students"""
        if request.user.role != 'PARENT':
            raise PermissionDenied("Only parents can use this action.")

        linked_links = ParentStudentLink.objects.filter(parent=request.user).prefetch_related('student')
        students = [link.student for link in linked_links]

        serializer = StudentDetailSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def link_parent(self, request, pk=None):
        """Link a parent user to a student"""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can link parents.")

        student = self.get_object()
        parent_id = request.data.get('parent_id')
        relationship = request.data.get('relationship')
        is_primary = request.data.get('is_primary', False)

        if not parent_id or not relationship:
            return Response(
                {'error': 'parent_id and relationship are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            parent = User.objects.get(id=parent_id, role='PARENT')
        except User.DoesNotExist:
            return Response(
                {'error': 'Parent user not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        link, created = ParentStudentLink.objects.update_or_create(
            parent=parent,
            student=student,
            defaults={'relationship': relationship, 'is_primary': is_primary}
        )

        serializer = ParentStudentLinkSerializer(link)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    @action(detail=True, methods=['get'])
    def student_card(self, request, pk=None):
        """Returns student ID card data (for QR generation)"""
        student = self.get_object()
        data = {
            'admission_number': student.admission_number,
            'name': student.user.get_full_name(),
            'class': student.student_class,
            'email': student.user.email,
            'school': str(student.school),
            'qr_code': request.build_absolute_uri(student.qr_code.url) if student.qr_code else None
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def class_list(self, request):
        """All students in a specified class"""
        class_name = request.query_params.get('class_name')
        if not class_name:
            return Response(
                {'error': 'class_name query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied("Only school staff can view class lists.")

        students = self.get_queryset().filter(student_class=class_name)
        serializer = self.get_serializer(students, many=True)
        return Response(serializer.data)


class ParentStudentLinkViewSet(viewsets.ModelViewSet):
    queryset = ParentStudentLink.objects.select_related('parent', 'student')
    serializer_class = ParentStudentLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ParentStudentLink.objects.select_related('parent', 'student')

        if user.role == 'SCHOOL_ADMIN' or user.role == 'SUB_ADMIN':
            queryset = queryset.filter(student__school=user.school)
        elif user.role == 'PARENT':
            queryset = queryset.filter(parent=user)
        elif user.role == 'STUDENT':
            queryset = queryset.filter(student__user=user)
        else:
            queryset = queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can create parent-student links.")
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can delete parent-student links.")
        return super().destroy(request, *args, **kwargs)
