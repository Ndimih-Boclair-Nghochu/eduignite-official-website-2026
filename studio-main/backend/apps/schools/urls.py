from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet, SchoolSettingsViewSet

app_name = 'schools'

router = DefaultRouter()
router.register(r'schools', SchoolViewSet, basename='school')
router.register(r'settings', SchoolSettingsViewSet, basename='school-settings')

urlpatterns = [
    path('', include(router.urls)),
]
