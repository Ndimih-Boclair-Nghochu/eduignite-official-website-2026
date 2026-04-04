from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, ParentStudentLinkViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'parent-student-links', ParentStudentLinkViewSet, basename='parent-student-link')

urlpatterns = [
    path('', include(router.urls)),
]
