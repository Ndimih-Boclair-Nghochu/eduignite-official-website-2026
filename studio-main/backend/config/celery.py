import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('eduignite')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

app.conf.beat_schedule = {
    'send-daily-school-reports': {
        'task': 'apps.reports.tasks.send_daily_school_reports',
        'schedule': crontab(hour=18, minute=0),
    },
    'generate-monthly-fee-statements': {
        'task': 'apps.fees.tasks.generate_monthly_fee_statements',
        'schedule': crontab(day_of_month=1, hour=0, minute=0),
    },
    'reset-daily-ai-requests': {
        'task': 'apps.users.tasks.reset_daily_ai_requests',
        'schedule': crontab(hour=0, minute=0),
    },
    'cleanup-expired-tokens': {
        'task': 'apps.authentication.tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=2, minute=0),
    },
    'process-attendance-notifications': {
        'task': 'apps.attendance.tasks.process_attendance_notifications',
        'schedule': crontab(hour=7, minute=30),
    },
    'generate-assessment-reports': {
        'task': 'apps.assessments.tasks.generate_assessment_reports',
        'schedule': crontab(day_of_week=5, hour=17, minute=0),
    },
    'cleanup-old-notifications': {
        'task': 'apps.notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(day_of_week=0, hour=3, minute=0),
    },
    'sync-library-inventory': {
        'task': 'apps.library.tasks.sync_library_inventory',
        'schedule': crontab(hour=1, minute=0),
    },
}

app.conf.timezone = 'UTC'


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
