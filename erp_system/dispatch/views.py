from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.db.models import Q
from .models import DispatchHistory
from .serializers import DispatchHistorySerializer, DashboardOrderSerializer
from customer_order.models import CustomerOrder
from inventory.models import Inventory, InventoryLog
from api.pagination import StandardPagination

class DispatchViewSet(viewsets.ModelViewSet):
    queryset = DispatchHistory.objects.all()
    serializer_class = DispatchHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    @action(detail=False, methods=['get'], url_path='eligible-orders')
    def eligible_orders(self, request):
        """
        Orders that are in production, ready for dispatch, or partially shipped (but not short-closed).
        Short-closed orders are excluded as they will not accept further shipments.
        DISPATCHED orders are excluded as they are finished.
        """
        orders = CustomerOrder.objects.filter(
            status__in=['IN_PRODUCTION', 'READY_FOR_DISPATCH', 'PARTIALLY_SHIPPED'],
            is_deleted=False,
            is_short_closed=False
        ).select_related('company', 'client', 'part', 'production_report').prefetch_related('dispatch_history')

        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = DashboardOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

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

    @action(detail=True, methods=['post'], url_path='upload-invoice')
    def upload_invoice(self, request, pk=None):
        try:
            dispatch = DispatchHistory.objects.get(id=pk)
        except DispatchHistory.DoesNotExist:
            return Response({"error": "Dispatch record not found"}, status=status.HTTP_404_NOT_FOUND)

        invoice_file = request.FILES.get('invoice_pdf')
        if not invoice_file:
            return Response({"error": "Invoice PDF is required"}, status=status.HTTP_400_BAD_REQUEST)

        document_type = (request.data.get('document_type') or 'main').lower()
        if document_type == 'supplementary':
            dispatch.supplementary_invoice_pdf = invoice_file
            dispatch.main_invoice_pdf = invoice_file
            dispatch.save()
            if dispatch.parent_dispatch:
                dispatch.parent_dispatch.supplementary_invoice_pdf = invoice_file
                dispatch.parent_dispatch.save()
            for child in dispatch.supplementary_dispatches.all():
                child.supplementary_invoice_pdf = invoice_file
                child.main_invoice_pdf = invoice_file
                child.save()
        else:
            dispatch.main_invoice_pdf = invoice_file
            dispatch.save()

        return Response({"message": "Invoice uploaded successfully"})

    @action(detail=False, methods=['get'], url_path='history')
    def history_list(self, request):
        """
        List of all past dispatches with filters.
        """
        client_name = request.query_params.get('client')
        company_name = request.query_params.get('company')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = DispatchHistory.objects.filter(parent_dispatch__isnull=True).select_related('order', 'dispatched_by')

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
        has_supplementary = request.data.get('has_supplementary') in ['true', 'True', '1', True, 1]
        supplementary_shipped_quantity = request.data.get('supplementary_shipped_quantity', 0)
        main_invoice_pdf = request.FILES.get('main_invoice_pdf')
        main_qc_report_pdf = request.FILES.get('main_qc_report_pdf')
        supplementary_invoice_pdf = request.FILES.get('supplementary_invoice_pdf')
        supplementary_qc_report_pdf = request.FILES.get('supplementary_qc_report_pdf')

        if not order_id:
            return Response({"error": "Order ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not shipped_quantity:
            return Response({"error": "Shipped quantity is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            shipped_quantity = int(shipped_quantity)
            supplementary_shipped_quantity = int(supplementary_shipped_quantity)
        except ValueError:
            return Response({"error": "Invalid shipped quantity"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = CustomerOrder.objects.get(id=order_id)
        except CustomerOrder.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        if shipped_quantity <= 0:
            return Response({"error": "Main shipped quantity must be positive"}, status=status.HTTP_400_BAD_REQUEST)
        if shipped_quantity > order.quantity:
            return Response({"error": "Main shipped quantity cannot exceed the ordered quantity"}, status=status.HTTP_400_BAD_REQUEST)
        if order.shipped_quantity + shipped_quantity > order.quantity:
            return Response({"error": "Main shipped quantity exceeds the remaining ordered quantity"}, status=status.HTTP_400_BAD_REQUEST)
        if has_supplementary and supplementary_shipped_quantity <= 0:
            return Response({"error": "Supplementary shipped quantity must be positive"}, status=status.HTTP_400_BAD_REQUEST)

        if not order.qc_report and not main_qc_report_pdf:
            return Response({"error": "Main QC report PDF is required"}, status=status.HTTP_400_BAD_REQUEST)
        if has_supplementary and not supplementary_qc_report_pdf:
            return Response({"error": "Supplementary QC report PDF is required"}, status=status.HTTP_400_BAD_REQUEST)

        if order.status not in ['READY_FOR_DISPATCH', 'PARTIALLY_SHIPPED']:
            return Response({"error": f"Order status is {order.status}. Cannot dispatch."}, status=status.HTTP_400_BAD_REQUEST)
        if not hasattr(order, 'production_report') or getattr(order.production_report, 'status', None) != 'COMPLETED':
            return Response({"error": "Production must be completed before dispatching."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                inventory = Inventory.objects.get(company=order.company, part=order.part)
                available_finished_goods = inventory.finished_blanks or 0
                total_shipped_quantity = shipped_quantity + (supplementary_shipped_quantity if has_supplementary else 0)

                if total_shipped_quantity > available_finished_goods:
                    raise Exception("Cannot ship more than available finished goods.")

                effective_main_qc = main_qc_report_pdf or order.qc_report

                # 1. Create Main Dispatch History record
                dispatch_history = DispatchHistory.objects.create(
                    order=order,
                    po_number=order.po_number,
                    client_name=order.client.name,
                    company_name=order.company.name,
                    part_name=order.part.name,
                    ordered_quantity=order.quantity,
                    actual_shipped_quantity=shipped_quantity,
                    shipped_quantity=shipped_quantity,
                    main_invoice_pdf=main_invoice_pdf,
                    main_qc_report_pdf=effective_main_qc,
                    qc_report=effective_main_qc,
                    has_supplementary=has_supplementary,
                    supplementary_shipped_quantity=supplementary_shipped_quantity if has_supplementary else 0,
                    supplementary_invoice_pdf=supplementary_invoice_pdf if has_supplementary else None,
                    supplementary_qc_report_pdf=supplementary_qc_report_pdf if has_supplementary else None,
                    is_short_closed=is_short_close,
                    dispatched_by=request.user
                )

                if has_supplementary:
                    DispatchHistory.objects.create(
                        order=order,
                        parent_dispatch=dispatch_history,
                        po_number=order.po_number,
                        client_name=order.client.name,
                        company_name=order.company.name,
                        part_name=order.part.name,
                        ordered_quantity=0,
                        actual_shipped_quantity=supplementary_shipped_quantity,
                        shipped_quantity=supplementary_shipped_quantity,
                        main_invoice_pdf=supplementary_invoice_pdf,
                        main_qc_report_pdf=supplementary_qc_report_pdf,
                        qc_report=supplementary_qc_report_pdf,
                        supplementary_invoice_pdf=supplementary_invoice_pdf,
                        supplementary_qc_report_pdf=supplementary_qc_report_pdf,
                        is_short_closed=False,
                        dispatched_by=request.user
                    )

                # 2. Update Inventory
                reason = f"Sales Out (Dispatch) for PO: {order.po_number}. Client: {order.client.name}."
                inventory.decrease_finished(
                    qty=total_shipped_quantity,
                    user=request.user,
                    change_type=InventoryLog.SALES_OUT,
                    reason=reason
                )

                # 3. Update Order: Track shipped quantity and short-close status
                order.shipped_quantity += total_shipped_quantity

                if is_short_close:
                    order.is_short_closed = True
                    order.status = 'PARTIALLY_SHIPPED'
                    if hasattr(order, 'production_report'):
                        order.production_report.status = 'COMPLETED'
                        order.production_report.save()
                elif order.shipped_quantity >= order.quantity:
                    order.status = 'DISPATCHED'
                    if hasattr(order, 'production_report'):
                        order.production_report.status = 'COMPLETED'
                        order.production_report.save()
                else:
                    order.status = 'PARTIALLY_SHIPPED'

                order.save()

                serializer = self.get_serializer(dispatch_history)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Inventory.DoesNotExist:
            return Response({"error": "Inventory record not found."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
