from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeeStructureViewSet, PaymentViewSet, InvoiceViewSet

router = DefaultRouter()
router.register(r'fee-structures', FeeStructureViewSet, basename='fee-structure')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', include(router.urls)),
]
