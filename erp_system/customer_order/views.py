from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import CustomerOrder
from .serializers import CustomerOrderSerializer
from .permissions import IsAdminOrManagerForWrite


class CustomerOrderListCreateView(generics.ListCreateAPIView):
    """
    List all customer orders (except DISPATCHED) or create a new one.
    Only ADMIN/MANAGER (or superuser) can create.
    """

    def get_queryset(self):
        return CustomerOrder.objects.filter(
            is_deleted=False
        ).exclude(
            status=CustomerOrder.STATUS_DISPATCHED
        ).select_related("company", "client", "part", "created_by")

    serializer_class = CustomerOrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerForWrite]


class CustomerOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a single customer order.
    Updates and deletes are restricted to ADMIN/MANAGER (or superuser).
    Additionally, DISPATCHED orders cannot be edited or deleted.
    """

    queryset = CustomerOrder.objects.filter(is_deleted=False).select_related("company", "client", "part", "created_by")
    serializer_class = CustomerOrderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerForWrite]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == CustomerOrder.STATUS_DISPATCHED:
            return Response(
                {"detail": "Cannot edit a dispatched order."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == CustomerOrder.STATUS_DISPATCHED:
            return Response(
                {"detail": "Cannot delete a dispatched order."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Soft delete
        instance.is_deleted = True
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        # This is not called since we overrode destroy to add the status check
        pass
