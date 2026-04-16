import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    is_production = any(
        os.environ.get(env_var)
        for env_var in ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT', 'RAILWAY_ENVIRONMENT_NAME']
    ) or os.environ.get('ENVIRONMENT') == 'production'
    os.environ.setdefault(
        'DJANGO_SETTINGS_MODULE',
        'config.settings.production' if is_production else 'config.settings.development'
    )

django_asgi_app = get_asgi_application()

from apps.chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
