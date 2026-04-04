from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlatformSettingsView,
    PlatformFeesViewSet,
    PublicEventViewSet,
    TutorialLinkViewSet,
    PlatformStatsView,
    ClearDemoDataView,
)

app_name = 'platform'

router = DefaultRouter()
router.register(r'fees', PlatformFeesViewSet, basename='fee')
router.register(r'events', PublicEventViewSet, basename='event')
router.register(r'tutorials', TutorialLinkViewSet, basename='tutorial')

urlpatterns = [
    path('', include(router.urls)),
    path('settings/', PlatformSettingsView.as_view(), name='settings'),
    path('stats/', PlatformStatsView.as_view(), name='stats'),
    path('clear-demo-data/', ClearDemoDataView.as_view(), name='clear-demo-data'),
]
