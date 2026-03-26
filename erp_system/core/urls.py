from django.urls import path
from .views import CompanyListView, PartListView, ClientListView, MachineListView, OperatorListView

urlpatterns = [
   path("companies/", CompanyListView.as_view(), name="companies"),
   path("parts/", PartListView.as_view(), name="parts"),
   path("clients/", ClientListView.as_view(), name="clients"),
   path("machines/", MachineListView.as_view(), name="machines"),
   path("operators/", OperatorListView.as_view(), name="operators"),
]