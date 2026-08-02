from django.urls import path

from .views import CustomerOrderListCreateView, CustomerOrderDetailView, CustomerOrderLogListView


urlpatterns = [
    path("customer-orders/", CustomerOrderListCreateView.as_view(), name="customerorder-list-create"),
    path("customer-orders/logs/", CustomerOrderLogListView.as_view(), name="customerorder-logs"),
    path("customer-orders/<int:pk>/", CustomerOrderDetailView.as_view(), name="customerorder-detail"),
]

