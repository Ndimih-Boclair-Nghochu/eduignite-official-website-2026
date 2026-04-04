from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookCategoryViewSet, BookViewSet, BookLoanViewSet

router = DefaultRouter()
router.register(r'categories', BookCategoryViewSet, basename='bookcategory')
router.register(r'books', BookViewSet, basename='book')
router.register(r'loans', BookLoanViewSet, basename='bookloan')

urlpatterns = [
    path('', include(router.urls)),
]
