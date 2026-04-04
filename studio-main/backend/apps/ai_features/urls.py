from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'ai_features'

router = DefaultRouter()
router.register(r'requests', views.AIRequestViewSet, basename='ai-request')
router.register(r'insights', views.AIInsightViewSet, basename='ai-insight')

urlpatterns = [
    path('', include(router.urls)),
]
