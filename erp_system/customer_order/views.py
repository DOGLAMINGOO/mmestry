from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import CustomerOrder
from .serializers import CustomerOrderSerializer
from .permissions import IsAdminOrManagerForWrite


class CustomerOrderListCreateView(generics.ListCreateAPIView):
    """
    List all customer orders or create a new one.
    Only ADMIN/MANAGER (or superuser) can create.
    """

    queryset = CustomerOrder.objects.all().select_related("company", "client", "part", "created_by")
    serializer_class = CustomerOrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerForWrite]


class CustomerOrderDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update a single customer order.
    Updates are restricted to ADMIN/MANAGER (or superuser).
    """

    queryset = CustomerOrder.objects.all().select_related("company", "client", "part", "created_by")
    serializer_class = CustomerOrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerForWrite]

