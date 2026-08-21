from django.urls import path
from .views import (
    InventoryView, InventoryDetailView, InventoryDestroyView,
    InventoryAdjustView, StockReceiptListCreateView, InventoryLogListView,
    InventoryReportView,
)

urlpatterns = [
    path('inventory/', InventoryView.as_view(), name="inventory"),
    path('inventory/<int:pk>/', InventoryDetailView.as_view(), name="inventory-detail"),
    path('inventory/delete/<int:pk>/', InventoryDestroyView.as_view(), name="inventory-delete"),
    path('inventory/<int:pk>/adjust/', InventoryAdjustView.as_view(), name='inventory-adjust'),
    path('inventory/logs/', InventoryLogListView.as_view(), name='inventory-logs'),
    path('inventory/report/', InventoryReportView.as_view(), name='inventory-report'),
    path('inventory/stock-receipts/', StockReceiptListCreateView.as_view(), name='stock-receipt-list-create'),
]