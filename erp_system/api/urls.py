from django.urls import path, include


#from the apps import the urls setitngs here 
urlpatterns = [
    path('', include('core.urls')),       # /api/companies/, /api/parts/
    path('', include('inventory.urls')),  # /api/inventory, /api/inventory/<id>
    
    
]