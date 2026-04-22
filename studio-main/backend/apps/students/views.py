import csv
from io import StringIO
import uuid as _uuid

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Student, ParentStudentLink, StudentActivationToken
from .serializers import (
    StudentListSerializer, StudentDetailSerializer, StudentCreateSerializer,
    StudentUpdateSerializer, ParentStudentLinkSerializer, HonourRollSerializer,
    StudentActivationTokenSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related('user', 'school').prefetch_related('parent_links')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['class_level', 'section', 'school']
    search_fields = ['user__name', 'user__email', 'user__matricule', 'admission_number', 'student_class']
    ordering_fields = ['admission_date', 'user__name', 'admission_number', 'annual_average']
    ordering = ['user__name']

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
        student = serializer.save()
        response_data = StudentDetailSerializer(student, context=self.get_serializer_context()).data
        response_data['student_matricule'] = getattr(student.user, 'matricule', '')
        primary_parent_link = student.parent_links.filter(is_primary=True).select_related('parent').first()
        response_data['parent_matricule'] = getattr(primary_parent_link.parent, 'matricule', None) if primary_parent_link else None
        return Response(response_data, status=status.HTTP_201_CREATED)

    def _flatten_error_messages(self, errors, prefix=""):
        messages = []

        if isinstance(errors, dict):
            for field, value in errors.items():
                field_prefix = f"{prefix}.{field}" if prefix else str(field)
                messages.extend(self._flatten_error_messages(value, field_prefix))
            return messages

        if isinstance(errors, list):
            for value in errors:
                if isinstance(value, (dict, list)):
                    messages.extend(self._flatten_error_messages(value, prefix))
                else:
                    label = prefix.replace("_", " ").strip() if prefix else "error"
                    messages.append(f"{label}: {value}")
            return messages

        label = prefix.replace("_", " ").strip() if prefix else "error"
        messages.append(f"{label}: {errors}")
        return messages

    def _extract_name_from_row(self, row):
        preferred_columns = [
            'name', 'student_name', 'full_name', 'fullname', 'student', 'learner_name',
            'nom', 'noms', 'student names'
        ]
        lowered_map = {str(key).strip().lower(): value for key, value in row.items() if key is not None}

        for column in preferred_columns:
            value = lowered_map.get(column)
            if isinstance(value, str) and value.strip():
                return value.strip()

        for value in row.values():
            if not isinstance(value, str):
                continue
            cleaned = value.strip()
            if not cleaned:
                continue
            if '@' in cleaned:
                continue
            digits = ''.join(char for char in cleaned if char.isdigit())
            if digits and len(digits) >= max(6, len(cleaned) - 2):
                continue
            return cleaned
        return ''

    def _infer_class_level(self, student_class):
        label = (student_class or '').strip().lower()
        normalized = label.replace(' ', '')
        if 'upper sixth' in label or 'upper6' in normalized:
            return 'upper_sixth'
        if 'lower sixth' in label or 'lower6' in normalized:
            return 'lower_sixth'
        if 'form1' in normalized:
            return 'form1'
        if 'form2' in normalized:
            return 'form2'
        if 'form3' in normalized:
            return 'form3'
        if 'form4' in normalized:
            return 'form4'
        if 'form5' in normalized:
            return 'form5'
        return 'form1'

    def _infer_section(self, student_class):
        label = (student_class or '').strip().lower()
        if 'bilingual' in label:
            return 'bilingual'
        if 'technical' in label:
            return 'technical'
        if 'science' in label:
            return 'science'
        if 'arts' in label or 'art' in label:
            return 'arts'
        if 'commercial' in label or 'commerce' in label:
            return 'commercial'
        return 'general'

    def _generate_activation_matricule(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        while True:
            matricule = f'STU{_uuid.uuid4().hex[:8].upper()}'
            if StudentActivationToken.objects.filter(matricule=matricule).exists():
                continue
            if User.objects.filter(matricule=matricule).exists():
                continue
            return matricule

    def _render_activation_sheet_document(self, school, generated_tokens, title_suffix):
        rows = ''.join(
            f"""
            <tr>
              <td style="padding:10px;border:1px solid #ddd;">{index}</td>
              <td style="padding:10px;border:1px solid #ddd;">{token.student_name or 'Student activation slot'}</td>
              <td style="padding:10px;border:1px solid #ddd;">{token.matricule}</td>
              <td style="padding:10px;border:1px solid #ddd;">{token.student_class}</td>
              <td style="padding:10px;border:1px solid #ddd;">{token.get_class_level_display()}</td>
              <td style="padding:10px;border:1px solid #ddd;">{token.get_section_display()}</td>
            </tr>
            """
            for index, token in enumerate(generated_tokens, start=1)
        )
        return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Student Activation Sheet - {title_suffix}</title></head>
<body style="font-family:Arial,sans-serif;padding:32px;color:#111;">
  <h1 style="margin:0 0 8px;">{school.name}</h1>
  <p style="margin:0 0 24px;">Student activation sheet for {title_suffix}</p>
  <table style="border-collapse:collapse;width:100%;">
    <thead>
      <tr>
        <th style="padding:10px;border:1px solid #ddd;text-align:left;">#</th>
        <th style="padding:10px;border:1px solid #ddd;text-align:left;">Student Name</th>
        <th style="padding:10px;border:1px solid #ddd;text-align:left;">Matricule</th>
        <th style="padding:10px;border:1px solid #ddd;text-align:left;">Class</th>
        <th style="padding:10px;border:1px solid #ddd;text-align:left;">Level</th>
        <th style="padding:10px;border:1px solid #ddd;text-align:left;">Section</th>
      </tr>
    </thead>
    <tbody>{rows}</tbody>
  </table>
  <p style="margin-top:24px;">Each matricule can only activate one account. Once used, the platform will reject any second activation attempt.</p>
</body>
</html>"""

    def _iter_upload_rows(self, decoded):
        stripped_lines = [line for line in decoded.splitlines() if line.strip()]
        if not stripped_lines:
            return

        try:
            dialect = csv.Sniffer().sniff('\n'.join(stripped_lines[:5]), delimiters=',;\t|')
        except csv.Error:
            dialect = csv.excel

        try:
            has_header = csv.Sniffer().has_header('\n'.join(stripped_lines[:5]))
        except csv.Error:
            has_header = False

        if has_header:
            reader = csv.DictReader(StringIO('\n'.join(stripped_lines)), dialect=dialect)
            for index, row in enumerate(reader, start=2):
                yield index, row or {}
            return

        for index, line in enumerate(stripped_lines, start=1):
            parts = next(csv.reader([line], dialect=dialect))
            row = {f'column_{position}': value for position, value in enumerate(parts)}
            yield index, row

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
            parent = User.objects.get(id=parent_id, role='PARENT', school=student.school)
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
            'qr_code': student.qr_code if student.qr_code else None
        }
        return Response(data)

    @action(detail=True, methods=['get'])
    def admission_form(self, request, pk=None):
        """Download a simple admission document for the student."""
        student = self.get_object()
        school = student.school
        user = student.user
        document = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Admission Form - {user.name}</title></head>
<body style="font-family:Arial,sans-serif;padding:32px;color:#111;">
  <h1 style="margin:0 0 8px;">{school.name}</h1>
  <p style="margin:0 0 24px;">Student Admission Record</p>
  <table style="border-collapse:collapse;width:100%;max-width:720px;">
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Student Name</strong></td><td style="padding:8px;border:1px solid #ddd;">{user.name}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Matricule</strong></td><td style="padding:8px;border:1px solid #ddd;">{user.matricule}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Admission Number</strong></td><td style="padding:8px;border:1px solid #ddd;">{student.admission_number}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Class</strong></td><td style="padding:8px;border:1px solid #ddd;">{student.student_class}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Class Level</strong></td><td style="padding:8px;border:1px solid #ddd;">{student.get_class_level_display()}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Section</strong></td><td style="padding:8px;border:1px solid #ddd;">{student.get_section_display()}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Email</strong></td><td style="padding:8px;border:1px solid #ddd;">{user.email}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Guardian Name</strong></td><td style="padding:8px;border:1px solid #ddd;">{student.guardian_name or '-'}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Guardian Phone</strong></td><td style="padding:8px;border:1px solid #ddd;">{student.guardian_phone or '-'}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Admission Date</strong></td><td style="padding:8px;border:1px solid #ddd;">{student.admission_date}</td></tr>
  </table>
  <p style="margin-top:24px;">This student can activate the account with the matricule above and complete the remaining personal information after first login.</p>
</body>
</html>"""
        response = HttpResponse(document, content_type='text/html')
        response['Content-Disposition'] = f'attachment; filename="admission_{user.matricule}.html"'
        return response

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """Generate student activation matricules for a class or bulk create students from CSV."""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN']:
            raise PermissionDenied("Only school administrators can bulk register students.")

        generation_count = int(request.data.get('generation_count') or request.data.get('count') or 0)
        student_class = request.data.get('student_class', '').strip()
        class_level = request.data.get('class_level', '') or self._infer_class_level(student_class)
        section = request.data.get('section', '') or self._infer_section(student_class)
        department = request.data.get('department', '').strip()
        stream = request.data.get('stream', '').strip()
        batch_name = request.data.get('batch_name', '').strip() or student_class

        if generation_count:
            if not student_class:
                return Response(
                    {'detail': 'student_class is required for matricule generation.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if generation_count < 1:
                return Response(
                    {'detail': 'generation_count must be at least 1.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if generation_count > 500:
                return Response(
                    {'detail': 'generation_count cannot exceed 500 in one batch.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            generated_tokens = []
            for _ in range(generation_count):
                token = StudentActivationToken.objects.create(
                    school=request.user.school,
                    matricule=self._generate_activation_matricule(),
                    student_class=student_class,
                    class_level=class_level,
                    section=section,
                    department=department,
                    stream=stream,
                    batch_name=batch_name,
                    generated_by=request.user,
                )
                generated_tokens.append(token)

            return Response(
                {
                    'created_count': len(generated_tokens),
                    'failed_count': 0,
                    'detail': f'{len(generated_tokens)} activation matricules generated for {student_class}.',
                    'generated_students': StudentActivationTokenSerializer(generated_tokens, many=True).data,
                    'document_html': self._render_activation_sheet_document(
                        request.user.school,
                        generated_tokens,
                        batch_name or student_class,
                    ),
                },
                status=status.HTTP_201_CREATED,
            )

        upload = request.FILES.get('file')
        if not upload:
            return Response(
                {'detail': 'Provide generation_count to generate matricules or upload a CSV file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            decoded = upload.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response({'detail': 'Unable to read the uploaded file. Use UTF-8 CSV.'}, status=status.HTTP_400_BAD_REQUEST)

        created_students = []
        failed_rows = []

        base_payload = {
            'student_class': student_class,
            'class_level': class_level,
            'section': section,
            'admission_date': request.data.get('admission_date') or timezone.now().date(),
            'guardian_name': request.data.get('guardian_name', ''),
            'guardian_phone': request.data.get('guardian_phone', ''),
            'guardian_whatsapp': request.data.get('guardian_whatsapp', ''),
        }

        if not base_payload['student_class']:
            return Response(
                {'detail': 'student_class is required for bulk upload.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for index, row in self._iter_upload_rows(decoded):
            if not any(str(value).strip() for value in row.values()):
                continue

            normalized_row = {str(key).strip().lower(): value for key, value in row.items() if key is not None}

            row_payload = {
                **base_payload,
                'name': self._extract_name_from_row(normalized_row),
                'email': (normalized_row.get('email') or normalized_row.get('student_email') or '').strip(),
                'phone': (normalized_row.get('phone') or normalized_row.get('telephone') or '').strip(),
                'whatsapp': (normalized_row.get('whatsapp') or normalized_row.get('whatsapp_number') or '').strip(),
                'admission_number': (normalized_row.get('admission_number') or normalized_row.get('admission_no') or '').strip(),
                'class_level': (
                    (normalized_row.get('class_level') or normalized_row.get('level') or normalized_row.get('form') or '').strip()
                    or base_payload['class_level']
                    or self._infer_class_level(base_payload['student_class'])
                ),
                'section': (
                    (normalized_row.get('section') or normalized_row.get('department') or normalized_row.get('stream') or '').strip().lower()
                    or base_payload['section']
                    or self._infer_section(base_payload['student_class'])
                ),
                'guardian_name': (normalized_row.get('guardian_name') or normalized_row.get('parent_name') or base_payload['guardian_name'] or '').strip(),
                'guardian_phone': (normalized_row.get('guardian_phone') or normalized_row.get('parent_phone') or base_payload['guardian_phone'] or '').strip(),
                'guardian_whatsapp': (normalized_row.get('guardian_whatsapp') or normalized_row.get('parent_whatsapp') or base_payload['guardian_whatsapp'] or '').strip(),
            }

            serializer = StudentCreateSerializer(data=row_payload, context=self.get_serializer_context())
            if serializer.is_valid():
                student = serializer.save()
                created_students.append({
                    'id': str(student.id),
                    'name': student.user.name,
                    'matricule': student.user.matricule,
                    'admission_number': student.admission_number,
                })
            else:
                readable_errors = self._flatten_error_messages(serializer.errors)
                failed_rows.append({
                    'row': index,
                    'name': row_payload['name'],
                    'reason': " | ".join(readable_errors) if readable_errors else "This row failed validation.",
                    'errors': serializer.errors,
                })

        detail_message = (
            f"{len(created_students)} students created. {len(failed_rows)} rows failed."
            if failed_rows
            else f"{len(created_students)} students created successfully."
        )

        return Response(
            {
                'created_count': len(created_students),
                'failed_count': len(failed_rows),
                'created_students': created_students,
                'failed_rows': failed_rows,
                'detail': detail_message,
                'activation_sheet_url': f'/api/v1/students/students/activation_sheet/?class_name={base_payload["student_class"]}',
            },
            status=status.HTTP_201_CREATED if created_students else status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=['get'])
    def activation_sheet(self, request):
        """Download activation list containing student names and matricules."""
        if request.user.role not in ['SCHOOL_ADMIN', 'SUB_ADMIN', 'TEACHER']:
            raise PermissionDenied("Only school staff can download activation sheets.")

        class_name = request.query_params.get('class_name')
        token_queryset = StudentActivationToken.objects.filter(school=request.user.school)
        if class_name:
            token_queryset = token_queryset.filter(student_class=class_name)

        generated_tokens = list(token_queryset.order_by('student_class', 'matricule'))
        if generated_tokens:
            document = self._render_activation_sheet_document(
                request.user.school,
                generated_tokens,
                class_name or 'All Classes',
            )
            response = HttpResponse(document, content_type='text/html')
            filename_suffix = (class_name or 'all_classes').replace(' ', '_')
            response['Content-Disposition'] = f'attachment; filename="student_activation_sheet_{filename_suffix}.html"'
            return response

        students = self.get_queryset()
        if class_name:
            students = students.filter(student_class=class_name)

        lines = ['name,matricule,admission_number,class_name']
        for student in students.select_related('user').order_by('student_class', 'user__name'):
            lines.append(
                f'"{student.user.name}","{student.user.matricule}","{student.admission_number}","{student.student_class}"'
            )

        response = HttpResponse('\n'.join(lines), content_type='text/csv')
        filename_suffix = (class_name or 'all_classes').replace(' ', '_')
        response['Content-Disposition'] = f'attachment; filename="student_activation_sheet_{filename_suffix}.csv"'
        return response

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
