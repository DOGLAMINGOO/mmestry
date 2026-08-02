from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import CustomerOrder, CustomerOrderLog
from .serializers import CustomerOrderSerializer, CustomerOrderLogSerializer
from .permissions import IsAdminOrManagerForWrite


class CustomerOrderLogPagination(PageNumberPagination):
    page_size = 25


class CustomerOrderLogListView(generics.ListAPIView):
    serializer_class = CustomerOrderLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomerOrderLogPagination

    def get_queryset(self):
        queryset = CustomerOrderLog.objects.select_related("customer_order", "created_by").order_by("-created_at")

        po_number = self.request.query_params.get("po_number")
        action_type = self.request.query_params.get("action_type")
        company = self.request.query_params.get("company")

        if po_number:
            queryset = queryset.filter(po_number__icontains=po_number)
        if action_type:
            queryset = queryset.filter(action_type=action_type)
        if company:
            queryset = queryset.filter(company_name__icontains=company)

        return queryset


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

    def create(self, request, *args, **kwargs):
        data = request.data

        if isinstance(data, list):
            serializer = self.get_serializer(data=data, many=True)
        elif isinstance(data, dict) and data.get("items") is not None:
            items = data.get("items")
            if not isinstance(items, list):
                return Response({"items": "A list of order items is required."}, status=status.HTTP_400_BAD_REQUEST)

            common = {
                "po_number": data.get("po_number"),
                "po_date": data.get("po_date"),
                "company": data.get("company"),
                "client": data.get("client"),
            }
            serialized_items = [
                {**common, **item}
                for item in items
            ]
            serializer = self.get_serializer(data=serialized_items, many=True)
        else:
            serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


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
        CustomerOrderLog.objects.create(
            customer_order=instance,
            po_number=instance.po_number,
            company_name=instance.company.name,
            client_name=instance.client.name,
            part_name=instance.part.name,
            quantity=instance.quantity,
            deadline=instance.deadline,
            priority=instance.priority,
            status=instance.status,
            action_type=CustomerOrderLog.SOFT_DELETED,
            reason="Soft deleted via API",
            created_by=request.user if request.user.is_authenticated else None,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        # This is not called since we overrode destroy to add the status check
        pass
