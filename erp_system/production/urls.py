from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductionReportViewSet

router = DefaultRouter()
router.register(r'', ProductionReportViewSet, basename='production-report')

urlpatterns = router.urls
