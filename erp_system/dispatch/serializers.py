from rest_framework import serializers
from .models import DispatchHistory
from customer_order.models import CustomerOrder
from inventory.models import Inventory

class DispatchHistorySerializer(serializers.ModelSerializer):
    dispatched_by_username = serializers.CharField(source='dispatched_by.username', read_only=True)

    class Meta:
        model = DispatchHistory
        fields = [
            'id', 'order', 'po_number', 'client_name', 'company_name', 
            'part_name', 'shipped_quantity', 'qc_report', 'is_short_closed', 
            'dispatched_at', 'dispatched_by', 'dispatched_by_username'
        ]
        read_only_fields = ['dispatched_at', 'dispatched_by']

class DashboardOrderSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    part_name = serializers.CharField(source='part.name', read_only=True)
    production_status = serializers.SerializerMethodField()
    qc_report_status = serializers.SerializerMethodField()
    qc_report_url = serializers.SerializerMethodField()
    available_finished_goods = serializers.SerializerMethodField()
    produced_qty = serializers.SerializerMethodField()
    scrap_qty = serializers.SerializerMethodField()

    class Meta:
        model = CustomerOrder
        fields = [
            'id', 'po_number', 'company_name', 'client_name', 'part_name', 
            'deadline', 'quantity', 'status', 'production_status', 
            'qc_report_status', 'qc_report_url', 'available_finished_goods',
            'produced_qty', 'scrap_qty'
        ]

    def get_production_status(self, obj):
        try:
            return obj.production_report.status
        except:
            return "NOT_STARTED"

    def get_qc_report_status(self, obj):
        return "UPLOADED" if obj.qc_report else "MISSING"

    def get_qc_report_url(self, obj):
        try:
            return obj.qc_report.url
        except:
            return None

    def get_available_finished_goods(self, obj):
        try:
            inv = Inventory.objects.get(company=obj.company, part=obj.part)
            return inv.finished_blanks
        except Inventory.DoesNotExist:
            return 0

    def get_produced_qty(self, obj):
        try:
            return obj.production_report.produced_quantity or 0
        except:
            return 0

    def get_scrap_qty(self, obj):
        try:
            return obj.production_report.scrap_quantity or 0
        except:
            return 0
