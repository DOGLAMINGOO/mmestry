from django.urls import path

from .views import CustomerOrderListCreateView, CustomerOrderDetailView


urlpatterns = [
    path("customer-orders/", CustomerOrderListCreateView.as_view(), name="customerorder-list-create"),
    path("customer-orders/<int:pk>/", CustomerOrderDetailView.as_view(), name="customerorder-detail"),
]

