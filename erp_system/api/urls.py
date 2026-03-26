from django.urls import path, include
from api.views import CurrentUserView


# from the apps import the urls setitngs here
urlpatterns = [
    path("", include("core.urls")),             # /api/companies/, /api/parts/
    path("", include("inventory.urls")),        # /api/inventory, /api/inventory/<id>
    path("", include("customer_order.urls")),   # /api/customer-orders/, /api/customer-orders/<id>/
    path("production-reports/", include("production.urls")), # /api/production-reports/
    path("user/me/", CurrentUserView.as_view()),
]