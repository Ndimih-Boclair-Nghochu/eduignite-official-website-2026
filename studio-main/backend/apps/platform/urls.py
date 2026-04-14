from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlatformSettingsView,
    PlatformLogoUploadView,
    PlatformFeesViewSet,
    PublicEventViewSet,
    TutorialLinkViewSet,
    PlatformStatsView,
)

app_name = 'platform'

router = DefaultRouter()
router.register(r'fees', PlatformFeesViewSet, basename='fee')
router.register(r'events', PublicEventViewSet, basename='event')
router.register(r'tutorials', TutorialLinkViewSet, basename='tutorial')

urlpatterns = [
    path('', include(router.urls)),
    path('settings/', PlatformSettingsView.as_view(), name='settings'),
    path('upload-logo/', PlatformLogoUploadView.as_view(), name='upload-logo'),
    path('stats/', PlatformStatsView.as_view(), name='stats'),
]
