import os
from celery import Celery
from celery.schedules import crontab

if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    is_production = any(
        os.environ.get(env_var)
        for env_var in ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT', 'RAILWAY_ENVIRONMENT_NAME', 'RENDER']
    ) or os.environ.get('ENVIRONMENT') == 'production'
    os.environ.setdefault(
        'DJANGO_SETTINGS_MODULE',
        'config.settings.production' if is_production else 'config.settings.development'
    )

app = Celery('eduignite')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

app.conf.beat_schedule = {
    'reset-daily-ai-requests': {
        'task': 'apps.users.tasks.reset_daily_ai_requests',
        'schedule': crontab(hour=0, minute=0),
    },
    # Share governance: auto-remove expired share allocations every day at 03:00 UTC
    'expire-founder-shares': {
        'task': 'apps.users.tasks.expire_founder_shares',
        'schedule': crontab(hour=3, minute=0),
    },
    # Founder renewal enforcement: deactivate / delete founders past their
    # renewable-shares grace period every day at 03:30 UTC
    'enforce-founder-renewal': {
        'task': 'apps.users.tasks.enforce_founder_renewal',
        'schedule': crontab(hour=3, minute=30),
    },
}

app.conf.timezone = 'UTC'


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
