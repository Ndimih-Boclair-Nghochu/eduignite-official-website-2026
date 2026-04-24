import os
from django.core.wsgi import get_wsgi_application

if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    is_production = any(
        os.environ.get(env_var)
        for env_var in ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT', 'RAILWAY_ENVIRONMENT_NAME', 'RENDER']
    ) or os.environ.get('ENVIRONMENT') == 'production'
    os.environ.setdefault(
        'DJANGO_SETTINGS_MODULE',
        'config.settings.production' if is_production else 'config.settings.development'
    )

application = get_wsgi_application()
