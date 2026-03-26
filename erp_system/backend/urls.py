from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView #prebuilt views can get access tokens and refresh tokens
from api.views import CreateUserView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    path("api/login/", TokenObtainPairView.as_view(), name="get_token"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="refresh"),   
     
    path('api/user/register/', CreateUserView.as_view(), name='register'),
    
    path('api-auth/', include('rest_framework.urls')),
    
    path('api/', include('api.urls')),
]