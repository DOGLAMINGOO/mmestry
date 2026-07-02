from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django.db.models import Q
from .models import DispatchHistory
from .serializers import DispatchHistorySerializer, DashboardOrderSerializer
from customer_order.models import CustomerOrder
from inventory.models import Inventory, InventoryLog

class DispatchViewSet(viewsets.ModelViewSet):
    queryset = DispatchHistory.objects.all()
    serializer_class = DispatchHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PageNumberPagination

    @action(detail=False, methods=['get'], url_path='eligible-orders')
    def eligible_orders(self, request):
        """
        Orders that are in production, ready for dispatch, or partially shipped.
        DISPATCHED orders are excluded as they are finished.
        """
        orders = CustomerOrder.objects.filter(
            status__in=['IN_PRODUCTION', 'READY_FOR_DISPATCH', 'PARTIALLY_SHIPPED'],
            is_deleted=False
        ).select_related('company', 'client', 'part', 'production_report').prefetch_related('dispatch_history')
        serializer = DashboardOrderSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='upload-qc')
    def upload_qc(self, request, pk=None):
        try:
            order = CustomerOrder.objects.get(id=pk)
        except CustomerOrder.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        qc_report = request.FILES.get('qc_report')
        if not qc_report:
            return Response({"error": "QC Report PDF is required"}, status=status.HTTP_400_BAD_REQUEST)

        order.qc_report = qc_report
        order.save()
        return Response({"message": "QC Report uploaded successfully", "qc_report_url": order.qc_report.url})

    @action(detail=False, methods=['get'], url_path='history')
    def history_list(self, request):
        """
        List of all past dispatches with filters.
        """
        client_name = request.query_params.get('client')
        company_name = request.query_params.get('company')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = DispatchHistory.objects.all().select_related('order', 'dispatched_by')

        if client_name:
            queryset = queryset.filter(client_name__icontains=client_name)
        if company_name:
            queryset = queryset.filter(company_name__icontains=company_name)
        if start_date:
            queryset = queryset.filter(dispatched_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(dispatched_at__date__lte=end_date)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = DispatchHistorySerializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        order_id = request.data.get('order')
        shipped_quantity = request.data.get('shipped_quantity')
        is_short_close = request.data.get('is_short_close') == 'true' or request.data.get('is_short_close') is True
        
        if not order_id:
            return Response({"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not shipped_quantity:
            return Response({"error": "Shipped quantity is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shipped_quantity = int(shipped_quantity)
        except ValueError:
            return Response({"error": "Invalid shipped quantity"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = CustomerOrder.objects.get(id=order_id)
        except CustomerOrder.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        if not order.qc_report:
            return Response({"error": "QC Report must be uploaded before dispatching."}, status=status.HTTP_400_BAD_REQUEST)

        if order.status not in ['READY_FOR_DISPATCH', 'PARTIALLY_SHIPPED']:
            return Response({"error": f"Order status is {order.status}. Cannot dispatch."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # 1. Create Dispatch History (Snapshotting)
                dispatch_history = DispatchHistory.objects.create(
                    order=order,
                    po_number=order.po_number,
                    client_name=order.client.name,
                    company_name=order.company.name,
                    part_name=order.part.name,
                    shipped_quantity=shipped_quantity,
                    qc_report=order.qc_report,
                    is_short_closed=is_short_close,
                    dispatched_by=request.user
                )

                # 2. Update Inventory
                try:
                    inventory = Inventory.objects.get(company=order.company, part=order.part)
                    reason = f"Sales Out (Dispatch) for PO: {order.po_number}. Client: {order.client.name}. QC: {order.qc_report.name}"
                    inventory.decrease_finished(
                        qty=shipped_quantity, 
                        user=request.user, 
                        change_type=InventoryLog.SALES_OUT, 
                        reason=reason
                    )
                except Inventory.DoesNotExist:
                    raise Exception("Inventory record not found.")

                # 3. Update Order Status
                total_shipped = sum(d.shipped_quantity for d in order.dispatch_history.all())
                
                if is_short_close or total_shipped >= order.quantity:
                    order.status = 'DISPATCHED'
                else:
                    order.status = 'PARTIALLY_SHIPPED'
                
                order.save()

                serializer = self.get_serializer(dispatch_history)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
