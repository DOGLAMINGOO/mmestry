from django.urls import path
from .views import InventoryView, InventoryDetailView, InventoryDestroyView, InventoryAdjustView

urlpatterns = [
    path('inventory/', InventoryView.as_view(), name="inventory"),
    path('inventory/<int:pk>/', InventoryDetailView.as_view(), name="inventory-detail"),
    path('inventory/delete/<int:pk>/', InventoryDestroyView.as_view(), name="inventory-delete"),
    path('inventory/<int:pk>/adjust/', InventoryAdjustView.as_view(), name='inventory-adjust'),
]