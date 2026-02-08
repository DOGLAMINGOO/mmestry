from django.urls import path, include



urlpatterns = [
    path('', include('core.urls')),       # /api/companies/, /api/parts/
    path('', include('inventory.urls')),  # /api/inventory, /api/inventory/<id>
    
    
]