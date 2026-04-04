from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

api_v1_patterns = [
    path('auth/', include('apps.authentication.urls', namespace='authentication')),
    path('users/', include('apps.users.urls', namespace='users')),
    path('schools/', include('apps.schools.urls', namespace='schools')),
    path('students/', include('apps.students.urls', namespace='students')),
    path('grades/', include('apps.grades.urls', namespace='grades')),
    path('attendance/', include('apps.attendance.urls', namespace='attendance')),
    path('fees/', include('apps.fees.urls', namespace='fees')),
    path('library/', include('apps.library.urls', namespace='library')),
    path('announcements/', include('apps.announcements.urls', namespace='announcements')),
    path('community/', include('apps.community.urls', namespace='community')),
    path('chat/', include('apps.chat.urls', namespace='chat')),
    path('ai/', include('apps.ai_features.urls', namespace='ai_features')),
    path('orders/', include('apps.orders.urls', namespace='orders')),
    path('platform/', include('apps.platform.urls', namespace='platform')),
    path('feedback/', include('apps.feedback.urls', namespace='feedback')),
    path('support/', include('apps.support.urls', namespace='support')),
    path('staff-remarks/', include('apps.staff_remarks.urls', namespace='staff_remarks')),
    path('live-classes/', include('apps.live_classes.urls', namespace='live_classes')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_patterns)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
