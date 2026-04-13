from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from django.db.models import Q

from apps.users.models import User
from apps.students.models import Student
from apps.grades.models import Grade, Sequence
from apps.attendance.models import AttendanceRecord
from apps.schools.models import School

from .models import AIRequest, AIInsight
from .serializers import (
    AIRequestSerializer,
    AIRequestCreateSerializer,
    StudyPlanRequestSerializer,
    GradeAnalysisRequestSerializer,
    AttendanceInsightRequestSerializer,
    ExamPrepRequestSerializer,
    ParentReportRequestSerializer,
    AIInsightSerializer
)
from .tasks import process_ai_request, generate_weekly_insights
from .utils import check_ai_quota


class AIRequestViewSet(viewsets.ModelViewSet):
    serializer_class = AIRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get AI requests based on user role."""
        user = self.request.user
        queryset = AIRequest.objects.all()

        # Students see only their own requests
        if user.role == 'student':
            queryset = queryset.filter(user=user)
        # Teachers see requests from their students
        elif user.role == 'teacher':
            student_ids = Student.objects.filter(
                class_assigned__teacher=user
            ).values_list('user_id', flat=True).distinct()
            queryset = queryset.filter(
                Q(user=user) | Q(user_id__in=student_ids)
            )
        # Parents see requests from their children
        elif user.role == 'parent':
            children_ids = Student.objects.filter(
                parents=user
            ).values_list('user_id', flat=True).distinct()
            queryset = queryset.filter(user_id__in=children_ids)
        # Executives and school admins see all requests from their school
        elif user.role in ['executive', 'school_admin']:
            if hasattr(user, 'school'):
                queryset = queryset.filter(school=user.school)

        return queryset.select_related('user', 'school').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return AIRequestCreateSerializer
        return AIRequestSerializer

    def create(self, request, *args, **kwargs):
        """Create a new AI request."""
        # Check quota
        if not check_ai_quota(request.user):
            return Response(
                {'error': _('You have reached your AI request quota for this period.')},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get user's school
        school = None
        if hasattr(request.user, 'school'):
            school = request.user.school

        # Create AI request
        ai_request = AIRequest.objects.create(
            user=request.user,
            school=school,
            status='pending',
            **serializer.validated_data
        )

        # Queue processing task
        process_ai_request.delay(ai_request.id)

        return Response(
            AIRequestSerializer(ai_request).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='generate-study-plan')
    def generate_study_plan(self, request):
        """Generate AI-powered study plan for a student."""
        serializer = StudyPlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_id = serializer.validated_data['student_id']
        subjects = serializer.validated_data['subjects']
        weeks = serializer.validated_data.get('weeks', 4)

        # Verify user has permission to request this
        try:
            student = Student.objects.get(user_id=student_id)
            # Check permissions
            if request.user.role == 'student' and student.user != request.user:
                return Response(
                    {'error': _('You can only create study plans for yourself.')},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Student.DoesNotExist:
            return Response(
                {'error': _('Student not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check quota
        if not check_ai_quota(request.user):
            return Response(
                {'error': _('You have reached your AI request quota.')},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        from .utils import build_study_plan_prompt

        student_data = {
            'name': student.user.get_full_name(),
            'grade': student.current_class.name if student.current_class else 'N/A',
            'academic_level': getattr(student, 'academic_level', 'Average'),
        }

        prompt = build_study_plan_prompt(student_data, subjects, weeks)

        school = getattr(request.user, 'school', None)
        ai_request = AIRequest.objects.create(
            user=request.user,
            school=school,
            request_type='study_plan',
            prompt=prompt,
            status='pending'
        )

        process_ai_request.delay(ai_request.id)

        return Response(
            AIRequestSerializer(ai_request).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='analyze-grades')
    def analyze_grades(self, request):
        """Analyze student grades and provide insights."""
        serializer = GradeAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_id = serializer.validated_data['student_id']
        sequence_id = serializer.validated_data.get('sequence_id')

        # Verify permissions
        try:
            student = Student.objects.get(user_id=student_id)
            if request.user.role == 'student' and student.user != request.user:
                return Response(
                    {'error': _('You can only analyze your own grades.')},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Student.DoesNotExist:
            return Response(
                {'error': _('Student not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check quota
        if not check_ai_quota(request.user):
            return Response(
                {'error': _('You have reached your AI request quota.')},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        from .utils import build_grade_analysis_prompt

        # Get grades
        grades_queryset = Grade.objects.filter(student=student)
        if sequence_id:
            grades_queryset = grades_queryset.filter(sequence_id=sequence_id)

        grades_data = {}
        for grade in grades_queryset[:10]:  # Last 10 grades
            subject = grade.subject.name if grade.subject else 'Unknown'
            grades_data[subject] = {
                'grade': grade.score,
                'trend': grade.trend or 'stable'
            }

        student_data = {
            'name': student.user.get_full_name(),
            'grade': student.current_class.name if student.current_class else 'N/A',
            'gpa': student.gpa if hasattr(student, 'gpa') else 'N/A',
        }

        prompt = build_grade_analysis_prompt(student_data, grades_data)

        school = getattr(request.user, 'school', None)
        ai_request = AIRequest.objects.create(
            user=request.user,
            school=school,
            request_type='grade_analysis',
            prompt=prompt,
            status='pending'
        )

        process_ai_request.delay(ai_request.id)

        return Response(
            AIRequestSerializer(ai_request).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='attendance-insight')
    def attendance_insight(self, request):
        """Get attendance insights for a student or class."""
        serializer = AttendanceInsightRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_id = serializer.validated_data.get('student_id')
        class_name = serializer.validated_data.get('class_name')
        days = serializer.validated_data.get('days', 30)

        # Check quota
        if not check_ai_quota(request.user):
            return Response(
                {'error': _('You have reached your AI request quota.')},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        from .utils import build_attendance_prompt
        from datetime import timedelta
        from django.utils import timezone

        attendance_data = {}

        if student_id:
            try:
                student = Student.objects.get(user_id=student_id)
                if request.user.role == 'student' and student.user != request.user:
                    return Response(
                        {'error': _('You can only view your own attendance.')},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Student.DoesNotExist:
                return Response(
                    {'error': _('Student not found.')},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get attendance records
            start_date = (timezone.now() - timedelta(days=days)).date()
            attendance_records = AttendanceRecord.objects.filter(
                student=student,
                session__date__gte=start_date
            ).order_by('session__date')

            present = attendance_records.filter(status='present').count()
            absent = attendance_records.filter(status='absent').count()
            late = attendance_records.filter(status='late').count()
            total = attendance_records.count()

            attendance_data = {
                'present': present,
                'absent': absent,
                'late': late,
                'attendance_rate': (present / total * 100) if total > 0 else 0,
                'pattern': [record.status for record in attendance_records]
            }

        prompt = build_attendance_prompt(attendance_data)

        school = getattr(request.user, 'school', None)
        ai_request = AIRequest.objects.create(
            user=request.user,
            school=school,
            request_type='attendance_insight',
            prompt=prompt,
            status='pending'
        )

        process_ai_request.delay(ai_request.id)

        return Response(
            AIRequestSerializer(ai_request).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='exam-prep')
    def exam_prep(self, request):
        """Get exam preparation tips for a student and subject."""
        serializer = ExamPrepRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_id = serializer.validated_data['student_id']
        subject_id = serializer.validated_data['subject_id']

        # Check quota
        if not check_ai_quota(request.user):
            return Response(
                {'error': _('You have reached your AI request quota.')},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            student = Student.objects.get(user_id=student_id)
            if request.user.role == 'student' and student.user != request.user:
                return Response(
                    {'error': _('You can only request exam prep for yourself.')},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Student.DoesNotExist:
            return Response(
                {'error': _('Student not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get subject
        try:
            from apps.grades.models import Subject
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response(
                {'error': _('Subject not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        exam_date = serializer.validated_data.get('exam_date')

        prompt = f"""Create a comprehensive exam preparation guide for {student.user.get_full_name()} for {subject.name}.

Student Level: {student.current_class.name if student.current_class else 'N/A'}
Subject: {subject.name}
Exam Date: {exam_date or 'To be scheduled'}

Please provide:
1. Key topics and concepts to focus on
2. Common exam questions and formats
3. Study schedule leading up to the exam
4. Tips for effective revision
5. Time management strategies during exam
6. Common mistakes to avoid
7. Practice questions and solutions
8. Mental preparation and confidence building

Make the guide practical and actionable."""

        school = getattr(request.user, 'school', None)
        ai_request = AIRequest.objects.create(
            user=request.user,
            school=school,
            request_type='exam_prep',
            prompt=prompt,
            status='pending'
        )

        process_ai_request.delay(ai_request.id)

        return Response(
            AIRequestSerializer(ai_request).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='parent-report')
    def parent_report(self, request):
        """Generate parent-friendly progress report."""
        serializer = ParentReportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_id = serializer.validated_data['student_id']

        # Check quota
        if not check_ai_quota(request.user):
            return Response(
                {'error': _('You have reached your AI request quota.')},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            student = Student.objects.get(user_id=student_id)
            # Verify user is parent, teacher, or admin
            if request.user.role == 'parent':
                if student not in request.user.children.all():
                    return Response(
                        {'error': _('You do not have permission to view this student.')},
                        status=status.HTTP_403_FORBIDDEN
                    )
        except Student.DoesNotExist:
            return Response(
                {'error': _('Student not found.')},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get student data
        recent_grades = Grade.objects.filter(student=student).order_by('-created_at')[:5]
        grades_str = ', '.join([f"{g.subject.name}: {g.score}" for g in recent_grades])

        prompt = f"""Create a parent-friendly progress report for {student.user.get_full_name()}.

Academic Information:
- Current Class: {student.current_class.name if student.current_class else 'N/A'}
- Recent Grades: {grades_str or 'No recent grades'}
- GPA: {getattr(student, 'gpa', 'N/A')}

Please provide:
1. Overall academic summary (in simple language)
2. Strengths and accomplishments
3. Areas for improvement with specific suggestions
4. Attendance status (if applicable)
5. Behavioral observations (if applicable)
6. Suggested ways parents can support learning at home
7. Next steps and goals
8. Contact information for follow-up

Use simple, encouraging language that is easy for parents to understand."""

        school = getattr(request.user, 'school', None)
        ai_request = AIRequest.objects.create(
            user=request.user,
            school=school,
            request_type='parent_report',
            prompt=prompt,
            status='pending'
        )

        process_ai_request.delay(ai_request.id)

        return Response(
            AIRequestSerializer(ai_request).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='platform-insights')
    def platform_insights(self, request):
        """Get platform-wide analytics summary (executives only)."""
        if request.user.role not in ['executive', 'school_admin']:
            return Response(
                {'error': _('Only executives and school admins can access platform insights.')},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get aggregated school data
        school = getattr(request.user, 'school', None)

        prompt = f"""Generate a comprehensive platform-wide analytics summary report.

School: {school.name if school else 'All Schools'}

Please include:
1. Overall student performance trends
2. Attendance statistics and patterns
3. Subject-wise performance analysis
4. High-performing students and areas of excellence
5. At-risk students and intervention areas
6. Teacher effectiveness indicators
7. Class-wise performance comparison
8. Year-over-year trends
9. Key recommendations for improvement
10. Action items for leadership

Format as an executive summary with key metrics and insights."""

        ai_request = AIRequest.objects.create(
            user=request.user,
            school=school,
            request_type='general',
            prompt=prompt,
            status='pending'
        )

        process_ai_request.delay(ai_request.id)

        return Response(
            AIRequestSerializer(ai_request).data,
            status=status.HTTP_201_CREATED
        )


class AIInsightViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AIInsightSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get AI insights based on user role."""
        user = self.request.user
        queryset = AIInsight.objects.filter(is_active=True)

        school = getattr(user, 'school', None)
        if school:
            queryset = queryset.filter(school=school)

        # Filter by user's role
        user_roles = [user.role]
        if user.role == 'parent':
            user_roles.append('student')  # Parents see student-targeted insights

        queryset = queryset.filter(
            Q(target_role__contains=user.role) |
            Q(target_role__contains='all')
        )

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='generate-insights')
    def generate_insights(self, request):
        """Trigger AI insights generation (executives only)."""
        if request.user.role not in ['executive', 'school_admin']:
            return Response(
                {'error': _('Only executives and school admins can generate insights.')},
                status=status.HTTP_403_FORBIDDEN
            )

        generate_weekly_insights.delay()

        return Response({
            'status': 'Insights generation triggered',
            'message': _('Weekly insights are being generated. Check back shortly.')
        })


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def direct_chat(request):
    """
    Synchronous direct-chat endpoint using Groq API.
    Returns an immediate AI response (no Celery task).
    """
    from .utils import call_groq_api

    message = (request.data.get('message') or '').strip()
    if not message:
        return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Optional: include conversation history for context
    history = request.data.get('history', [])

    # Build messages list
    messages = []
    for entry in history[-10:]:  # Last 10 messages for context window
        role = entry.get('role', 'user')
        content = entry.get('content', '')
        if role in ('user', 'assistant') and content:
            messages.append({'role': role, 'content': content})

    # Build the prompt incorporating history as context text
    if messages:
        history_text = '\n'.join(
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in messages
        )
        full_prompt = f"Previous conversation:\n{history_text}\n\nUser: {message}"
    else:
        full_prompt = message

    result = call_groq_api(full_prompt)

    if result['success']:
        return Response({
            'reply': result['response'],
            'tokens_used': result['tokens_used'],
            'processing_time_ms': result['processing_time_ms'],
        })
    else:
        return Response(
            {'error': result.get('error', 'AI request failed')},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
