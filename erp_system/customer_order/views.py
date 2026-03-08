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

    queryset = CustomerOrder.objects.filter(is_deleted=False).select_related("company", "client", "part", "created_by")
    serializer_class = CustomerOrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerForWrite]


class CustomerOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a single customer order.
    Updates and deletes are restricted to ADMIN/MANAGER (or superuser).
    """

    queryset = CustomerOrder.objects.filter(is_deleted=False).select_related("company", "client", "part", "created_by")
    serializer_class = CustomerOrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerForWrite]

    def perform_destroy(self, instance):
        """
        Soft delete the customer order.
        """
        instance.is_deleted = True
        instance.save()

