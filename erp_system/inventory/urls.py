from django.urls import path
from .views import InventoryView, InventoryDetailView, InventoryDestroyView

urlpatterns = [
    path('inventory', InventoryView.as_view(), name="inventory"),
    path('inventory/<int:pk>', InventoryDetailView.as_view(), name="inventory-detail"),
    path('inventory/delete/<int:pk>/', InventoryDestroyView.as_view(), name="inventory-delete"),
]
