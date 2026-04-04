from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectViewSet, SequenceViewSet, GradeViewSet,
    TermResultViewSet, AnnualResultViewSet
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'sequences', SequenceViewSet, basename='sequence')
router.register(r'grades', GradeViewSet, basename='grade')
router.register(r'term-results', TermResultViewSet, basename='term-result')
router.register(r'annual-results', AnnualResultViewSet, basename='annual-result')

urlpatterns = [
    path('', include(router.urls)),
]
