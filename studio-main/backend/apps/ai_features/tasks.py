from celery import shared_task
from django.utils import timezone
from django.db.models import Avg, Q
from datetime import timedelta
import logging

from .models import AIRequest, AIInsight
from .utils import call_groq_api as call_gemini_api  # noqa: F401 — alias kept for compatibility

logger = logging.getLogger(__name__)


@shared_task
def process_ai_request(request_id):
    """
    Celery task to process an AI request.
    Calls Groq API and saves the response.
    """
    try:
        ai_request = AIRequest.objects.get(id=request_id)
        ai_request.status = 'processing'
        ai_request.save(update_fields=['status', 'updated_at'])

        # Call Groq API
        result = call_gemini_api(ai_request.prompt)

        if result['success']:
            ai_request.mark_completed(
                response=result['response'],
                tokens_used=result['tokens_used'],
                processing_time_ms=result['processing_time_ms']
            )

            # Increment user's monthly AI request count
            increment_ai_request_count(ai_request.user)

            logger.info(f"AI Request {request_id} completed successfully")
            return {
                'status': 'success',
                'request_id': request_id,
                'tokens_used': result['tokens_used']
            }
        else:
            ai_request.mark_failed(result['error'])
            logger.error(f"AI Request {request_id} failed: {result['error']}")
            return {
                'status': 'error',
                'request_id': request_id,
                'error': result['error']
            }

    except AIRequest.DoesNotExist:
        logger.error(f"AI Request {request_id} not found")
        return {
            'status': 'error',
            'error': f'Request {request_id} not found'
        }
    except Exception as e:
        logger.error(f"Error processing AI request {request_id}: {e}")
        try:
            ai_request = AIRequest.objects.get(id=request_id)
            ai_request.mark_failed(str(e))
        except:
            pass
        return {
            'status': 'error',
            'request_id': request_id,
            'error': str(e)
        }


@shared_task
def generate_weekly_insights():
    """
    Generate AI insights for all schools.
    Runs weekly to create performance summaries and alerts.
    """
    try:
        from schools.models import School
        from students.models import Student
        from academics.models import Grade

        schools = School.objects.all()
        insights_created = 0

        for school in schools:
            # Get top performers
            top_performers = Student.objects.filter(
                school=school
            ).annotate(
                avg_grade=Avg('grades__score')
            ).filter(
                avg_grade__gte=85
            ).order_by('-avg_grade')[:10]

            if top_performers.exists():
                honour_roll = {
                    'students': [
                        {
                            'name': s.user.get_full_name(),
                            'average': float(s.avg_grade) if s.avg_grade else 0
                        }
                        for s in top_performers
                    ],
                    'count': top_performers.count()
                }

                insight = AIInsight.objects.create(
                    school=school,
                    insight_type='honour_roll_prediction',
                    title='Weekly Honour Roll',
                    description='Top performing students this week',
                    data=honour_roll,
                    target_role='principal,executive,teacher',
                    expires_at=timezone.now() + timedelta(days=7)
                )
                insights_created += 1

            # Check for attendance alerts
            from attendance.models import Attendance

            low_attendance_students = []
            students = Student.objects.filter(school=school)

            for student in students:
                week_ago = timezone.now() - timedelta(days=7)
                attendance_records = Attendance.objects.filter(
                    student=student,
                    date__gte=week_ago
                )

                if attendance_records.exists():
                    attendance_rate = (
                        attendance_records.filter(status='present').count() /
                        attendance_records.count() * 100
                    )

                    if attendance_rate < 75:
                        low_attendance_students.append({
                            'name': student.user.get_full_name(),
                            'attendance_rate': attendance_rate
                        })

            if low_attendance_students:
                alert = AIInsight.objects.create(
                    school=school,
                    insight_type='attendance_alert',
                    title='Low Attendance Alert',
                    description=f'{len(low_attendance_students)} students with low attendance',
                    data={'students': low_attendance_students},
                    target_role='principal,teacher,parent',
                    expires_at=timezone.now() + timedelta(days=7)
                )
                insights_created += 1

        logger.info(f"Generated {insights_created} insights")
        return {
            'status': 'success',
            'insights_created': insights_created
        }

    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }


@shared_task
def reset_monthly_ai_quotas():
    """
    Reset monthly AI request counts for all users.
    Runs on the first day of each month.
    """
    try:
        from users.models import User

        # Reset ai_request_count
        User.objects.all().update(ai_request_count=0)

        logger.info("Monthly AI quotas reset for all users")
        return {
            'status': 'success',
            'message': 'Monthly quotas reset'
        }

    except Exception as e:
        logger.error(f"Error resetting monthly quotas: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }


@shared_task
def predict_dropout_risk():
    """
    Analyze attendance and grades to identify students at risk of dropping out.
    Creates risk alerts for intervention.
    """
    try:
        from students.models import Student
        from academics.models import Grade
        from attendance.models import Attendance

        at_risk_students = []

        students = Student.objects.all()

        for student in students:
            risk_score = 0

            # Check attendance (30% weight)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            attendance_records = Attendance.objects.filter(
                student=student,
                date__gte=thirty_days_ago
            )

            if attendance_records.exists():
                attendance_rate = (
                    attendance_records.filter(status='present').count() /
                    attendance_records.count() * 100
                )
                if attendance_rate < 70:
                    risk_score += 30

            # Check grades (40% weight)
            recent_grades = Grade.objects.filter(
                student=student
            ).order_by('-created_at')[:5]

            if recent_grades.exists():
                avg_grade = sum([g.score for g in recent_grades]) / len(recent_grades)
                if avg_grade < 50:
                    risk_score += 40

            # Check behavioral issues (30% weight)
            # This would depend on your discipline model
            # For now, we'll assume no behavioral model
            # You can add this if your system tracks it

            # If risk score is high, create alert
            if risk_score >= 60:
                at_risk_students.append({
                    'student_id': student.id,
                    'student_name': student.user.get_full_name(),
                    'risk_score': risk_score,
                    'school_id': student.school.id if hasattr(student, 'school') else None
                })

        # Create insights for high-risk students
        insights_created = 0
        for student_data in at_risk_students:
            school_id = student_data['school_id']
            if school_id:
                insight, created = AIInsight.objects.update_or_create(
                    school_id=school_id,
                    insight_type='dropout_risk',
                    defaults={
                        'title': f"Dropout Risk: {student_data['student_name']}",
                        'description': f"Risk score: {student_data['risk_score']}/100",
                        'data': student_data,
                        'target_role': 'principal,counselor,teacher',
                        'expires_at': timezone.now() + timedelta(days=30)
                    }
                )
                if created:
                    insights_created += 1

        logger.info(f"Identified {len(at_risk_students)} at-risk students")
        return {
            'status': 'success',
            'at_risk_count': len(at_risk_students),
            'insights_created': insights_created
        }

    except Exception as e:
        logger.error(f"Error predicting dropout risk: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }


def increment_ai_request_count(user):
    """Helper function to increment user's AI request count."""
    try:
        from django.db.models import F
        user.__class__.objects.filter(id=user.id).update(
            ai_request_count=F('ai_request_count') + 1
        )
    except Exception as e:
        logger.error(f"Error incrementing AI request count: {e}")
