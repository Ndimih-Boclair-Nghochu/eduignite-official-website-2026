import logging
import time
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


def call_groq_api(prompt, context=None, max_tokens=2048):
    """
    Call Groq API with the given prompt.

    Args:
        prompt (str): The prompt to send to Groq
        context (dict): Optional context data for the request (unused, kept for
                        backward-compatible call signatures)
        max_tokens (int): Maximum tokens for response

    Returns:
        dict: Response containing 'success', 'response', 'tokens_used', 'processing_time_ms'
    """
    try:
        from groq import Groq

        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValidationError(_('Groq API key is not configured.'))

        model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')

        client = Groq(api_key=api_key)

        start_time = time.time()

        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are the EduIgnite AI, a highly intelligent and supportive '
                        'educational assistant integrated into a SaaS school management '
                        'platform for schools in Cameroon. Always respond helpfully, '
                        'professionally, and in the language the user writes in '
                        '(English or French).'
                    ),
                },
                {
                    'role': 'user',
                    'content': prompt,
                },
            ],
            max_tokens=max_tokens,
            temperature=0.7,
            top_p=0.95,
        )

        processing_time = int((time.time() - start_time) * 1000)

        response_text = completion.choices[0].message.content
        tokens_used = completion.usage.total_tokens if completion.usage else 0

        return {
            'success': True,
            'response': response_text,
            'tokens_used': tokens_used,
            'processing_time_ms': processing_time,
        }

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return {
            'success': False,
            'error': f"Groq API error: {str(e)}",
            'response': None,
            'tokens_used': 0,
            'processing_time_ms': 0,
        }


# Keep old name as alias so any code that still references it doesn't break
call_gemini_api = call_groq_api


def build_study_plan_prompt(student_data, subjects, weeks):
    """
    Build a prompt for generating a personalized study plan.

    Args:
        student_data (dict): Student information
        subjects (list): List of subjects
        weeks (int): Number of weeks for the plan

    Returns:
        str: Formatted prompt for Groq API
    """
    subjects_str = ', '.join(subjects)

    prompt = f"""Create a comprehensive {weeks}-week study plan for {student_data.get('name', 'the student')} covering the following subjects: {subjects_str}.

Student Background:
- Current Grade: {student_data.get('grade', 'N/A')}
- Academic Level: {student_data.get('academic_level', 'Average')}
- Learning Style: {student_data.get('learning_style', 'Mixed')}

Please provide:
1. Weekly breakdown with specific topics to cover
2. Recommended study duration per subject per day
3. Key concepts and learning objectives for each subject
4. Suggested resources and study materials
5. Practice problems and assessments schedule
6. Tips for retention and understanding

Format the response as a structured study plan that can be easily followed."""

    return prompt


def build_grade_analysis_prompt(student, grades_data):
    """
    Build a prompt for analyzing student grades.

    Args:
        student (dict): Student information
        grades_data (dict): Grades and performance data

    Returns:
        str: Formatted prompt for Groq API
    """
    prompt = f"""Analyze the academic performance of {student.get('name', 'this student')} and provide insights.

Student Information:
- Grade Level: {student.get('grade', 'N/A')}
- Current GPA: {student.get('gpa', 'N/A')}

Recent Grades:
{format_grades_data(grades_data)}

Please provide:
1. Strengths in academic performance
2. Areas that need improvement
3. Subject-wise analysis and performance trends
4. Comparison with class averages if available
5. Specific recommendations for improvement
6. Predicted academic trajectory
7. Motivation and engagement assessment

Make the analysis encouraging but honest, with actionable recommendations."""

    return prompt


def build_attendance_prompt(attendance_data):
    """
    Build a prompt for analyzing attendance patterns.

    Args:
        attendance_data (dict): Attendance information

    Returns:
        str: Formatted prompt for Groq API
    """
    prompt = f"""Analyze attendance patterns and provide insights:

Attendance Data:
- Total Days Present: {attendance_data.get('present', 0)}
- Total Days Absent: {attendance_data.get('absent', 0)}
- Total Days Late: {attendance_data.get('late', 0)}
- Attendance Rate: {attendance_data.get('attendance_rate', 'N/A')}%

Recent Pattern:
{format_attendance_pattern(attendance_data.get('pattern', []))}

Please provide:
1. Overall attendance assessment
2. Patterns and trends (improving/declining/inconsistent)
3. Impact on academic performance
4. Risk factors if attendance is below threshold
5. Specific recommendations to improve attendance
6. Suggested interventions if necessary

Focus on constructive feedback that encourages better attendance."""

    return prompt


def check_ai_quota(user):
    """
    Check if user has remaining AI request quota.

    Args:
        user (User): User object

    Returns:
        bool: True if user is under quota, False otherwise
    """
    try:
        # Get user's AI request limit from settings
        monthly_limit = getattr(settings, 'AI_REQUEST_MONTHLY_LIMIT', 100)
        daily_limit = getattr(settings, 'AI_REQUEST_DAILY_LIMIT', 10)

        from django.utils import timezone
        from datetime import timedelta
        from .models import AIRequest

        # Check monthly quota
        thirty_days_ago = timezone.now() - timedelta(days=30)
        monthly_requests = AIRequest.objects.filter(
            user=user,
            created_at__gte=thirty_days_ago,
            status__in=['completed', 'processing']
        ).count()

        if monthly_requests >= monthly_limit:
            logger.warning(f"User {user.id} exceeded monthly AI quota")
            return False

        # Check daily quota
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_requests = AIRequest.objects.filter(
            user=user,
            created_at__gte=today,
            status__in=['completed', 'processing']
        ).count()

        if daily_requests >= daily_limit:
            logger.warning(f"User {user.id} exceeded daily AI quota")
            return False

        return True

    except Exception as e:
        logger.error(f"Error checking AI quota: {e}")
        # Default to allowing if there's an error
        return True


def format_grades_data(grades_data):
    """Format grades data for prompt."""
    if not grades_data:
        return "No recent grades available"

    formatted = []
    for subject, grade_info in grades_data.items():
        if isinstance(grade_info, dict):
            formatted.append(f"- {subject}: {grade_info.get('grade', 'N/A')} (Trend: {grade_info.get('trend', 'stable')})")
        else:
            formatted.append(f"- {subject}: {grade_info}")

    return '\n'.join(formatted)


def format_attendance_pattern(pattern):
    """Format attendance pattern for prompt."""
    if not pattern:
        return "No recent pattern data"

    return ', '.join(pattern[-14:])  # Show last 14 days
