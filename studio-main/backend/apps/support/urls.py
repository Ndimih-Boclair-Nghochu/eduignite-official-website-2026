from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupportContributionViewSet

router = DefaultRouter()
router.register(r'contributions', SupportContributionViewSet, basename='support-contribution')

urlpatterns = [
    path('', include(router.urls)),
]
