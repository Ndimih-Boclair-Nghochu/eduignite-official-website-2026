from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TestimonyViewSet, CommunityBlogViewSet, BlogCommentViewSet

router = DefaultRouter()
router.register(r'testimonies', TestimonyViewSet, basename='testimony')
router.register(r'blogs', CommunityBlogViewSet, basename='community-blog')
router.register(r'comments', BlogCommentViewSet, basename='blog-comment')

urlpatterns = [
    path('', include(router.urls)),
]
