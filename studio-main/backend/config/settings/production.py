from .base import *
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration

DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='example.com', cast=Csv())
render_external_hostname = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '').strip()
if render_external_hostname and render_external_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_external_hostname)

# ── CORS: lock down to configured origins in production ────────────────────
# Set CORS_ALLOWED_ORIGINS in .env (comma-separated):
# CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
# The base.py default (localhost) is overridden here by the env var
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='https://example.com',
    cast=Csv()
)
CORS_ALLOW_ALL_ORIGINS = False  # Never allow wildcard in production

# ── CSRF trusted origins (needed for Django 4+ with HTTPS) ─────────────────
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='https://example.com',
    cast=Csv()
)
render_external_url = os.environ.get('RENDER_EXTERNAL_URL', '').strip()
if render_external_url and render_external_url not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(render_external_url)

# ── Sentry error monitoring ────────────────────────────────────────────────
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style='url'),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=config('SENTRY_TRACES_SAMPLE_RATE', default=0.1, cast=float),
        send_default_pii=False,
        environment='production',
    )

SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)

SESSION_COOKIE_SECURE = True

CSRF_COOKIE_SECURE = True

SECURE_HSTS_SECONDS = 31536000

SECURE_HSTS_INCLUDE_SUBDOMAINS = True

SECURE_HSTS_PRELOAD = True

SECURE_BROWSER_XSS_FILTER = True

SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'),
    'style-src': ("'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'),
    'img-src': ("'self'", 'data:', 'https:'),
    'font-src': ("'self'", 'cdn.jsdelivr.net'),
}

DATABASES['default']['CONN_MAX_AGE'] = 600

if config('REDIS_URL', default=''):
    CACHES['default'] = {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
        }
    }

REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
]

LOGGING['loggers']['django']['level'] = 'INFO'
LOGGING['loggers']['apps']['level'] = 'INFO'

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'debug_toolbar']

MIDDLEWARE = [m for m in MIDDLEWARE if m != 'debug_toolbar.middleware.DebugToolbarMiddleware']

WHITENOISE_COMPRESS_OFFLINE = True
WHITENOISE_COMPRESSION_QUALITY = 80

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='EduIgnite <eduignitecmr@gmail.com>')

ADMINS = [
    (config('ADMIN_NAME', default='EduIgnite Administrator'), config('ADMIN_EMAIL', default='eduignitecmr@gmail.com')),
]

MANAGERS = ADMINS
