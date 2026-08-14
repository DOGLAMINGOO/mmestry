from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    CompanyListView, PartListView, ClientListView, MachineListView, OperatorListView,
    AdminPartViewSet, AdminClientViewSet, AdminMachineViewSet, AdminOperatorViewSet
)

router = SimpleRouter()
router.register(r'admin/parts', AdminPartViewSet, basename='admin-parts')
router.register(r'admin/clients', AdminClientViewSet, basename='admin-clients')
router.register(r'admin/machines', AdminMachineViewSet, basename='admin-machines')
router.register(r'admin/operators', AdminOperatorViewSet, basename='admin-operators')

urlpatterns = [
   path("companies/", CompanyListView.as_view(), name="companies"),
   path("parts/", PartListView.as_view(), name="parts"),
   path("clients/", ClientListView.as_view(), name="clients"),
   path("machines/", MachineListView.as_view(), name="machines"),
   path("operators/", OperatorListView.as_view(), name="operators"),
   path('', include(router.urls)),
]