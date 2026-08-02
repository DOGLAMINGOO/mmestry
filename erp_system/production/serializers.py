from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers
from .models import ProductionReport
from customer_order.models import CustomerOrder
from customer_order.serializers import CustomerOrderSerializer


class ProductionReportHistorySerializer(serializers.ModelSerializer):
    """Full serializer for the production reports history page."""
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    last_edited_by_username = serializers.CharField(source="last_edited_by.username", read_only=True)
    po_number = serializers.CharField(source="customer_order.po_number", read_only=True)
    company_name = serializers.CharField(source="customer_order.company.name", read_only=True)
    client_name = serializers.CharField(source="customer_order.client.name", read_only=True)
    part_name = serializers.CharField(source="customer_order.part.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    job_rating_display = serializers.CharField(source="get_job_rating_display", read_only=True)

    class Meta:
        model = ProductionReport
        fields = (
            "id",
            "po_number",
            "company_name",
            "client_name",
            "part_name",
            "machine_name",
            "operator_name",
            "status",
            "status_display",
            "required_quantity",
            "produced_quantity",
            "scrap_quantity",
            "deadline",
            "start_time",
            "end_time",
            "operator_working_hours",
            "parts_made_in_working_hours",
            "operator_overtime_hours",
            "parts_made_in_overtime",
            "idle_time_hours",
            "idle_reason",
            "job_rating",
            "job_rating_display",
            "remarks",
            "entry_logs",
            "created_by_username",
            "last_edited_by_username",
            "created_at",
            "updated_at",
        )


class ProductionReportListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view with key fields including finished qty"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    po_number = serializers.CharField(source='customer_order.po_number', read_only=True)
    remaining_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionReport
        fields = [
            'id', 'po_number', 'machine_name', 'operator_name', 
            'start_time', 'status', 'required_quantity', 'produced_quantity',
            'remaining_quantity', 'job_rating', 'created_by_username'
        ]
    
    def get_remaining_quantity(self, obj):
        """Calculate remaining quantity to produce"""
        if obj.produced_quantity:
            return max(0, obj.required_quantity - obj.produced_quantity)
        return obj.required_quantity


class ProductionReportSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    last_edited_by_username = serializers.CharField(source='last_edited_by.username', read_only=True)
    
    # Read-only nested representation of the Customer Order for the frontend to display details
    customer_order_details = CustomerOrderSerializer(source='customer_order', read_only=True)
    
    # Show remaining quantity needed
    remaining_quantity = serializers.SerializerMethodField()
    
    # Make these fields optional - they'll be auto-populated from customer_order if not provided
    deadline = serializers.DateField(required=False, allow_null=True)
    required_quantity = serializers.IntegerField(required=False, allow_null=True)
    customer_order = serializers.PrimaryKeyRelatedField(
        queryset=CustomerOrder.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = ProductionReport
        fields = '__all__'
        read_only_fields = ['created_by', 'last_edited_by', 'created_at', 'updated_at']

    def get_remaining_quantity(self, obj):
        """Calculate remaining quantity to produce"""
        if obj.produced_quantity:
            return max(0, obj.required_quantity - obj.produced_quantity)
        return obj.required_quantity

    def validate(self, data):
        """
        Custom validation rules as requested by the user.
        """
        # customer_order must be provided for creation
        customer_order = data.get('customer_order') or (self.instance.customer_order if self.instance else None)
        
        if not customer_order:
            raise serializers.ValidationError({
                "customer_order": "Customer Order is required. Please select an approved order to create a production report."
            })
        
        # Auto-populate deadline and required_quantity from customer_order if not provided
        if not data.get('deadline') and customer_order:
            data['deadline'] = customer_order.deadline
        
        if not data.get('required_quantity') and customer_order:
            data['required_quantity'] = customer_order.quantity
        
        # If idle time is provided and > 0, an idle reason MUST be provided
        idle_time_hours = data.get('idle_time_hours')
        idle_reason = data.get('idle_reason')
        
        # When updating (instance exists), we might not get all fields in data.
        # So we fall back to the existing instance values if not provided in the payload.
        if self.instance:
            if idle_time_hours is None:
                idle_time_hours = self.instance.idle_time_hours
            if idle_reason is None:
                idle_reason = self.instance.idle_reason
                
        if idle_time_hours and float(idle_time_hours) > 0:
            if not idle_reason or not idle_reason.strip():
                raise serializers.ValidationError({
                    "idle_reason": "Idle reason is mandatory when idle time is greater than 0."
                })

        # If job rating is provided and is NOT Excellent, remarks MUST be provided
        job_rating = data.get('job_rating')
        remarks = data.get('remarks')
        
        if self.instance:
            if job_rating is None:
                job_rating = self.instance.job_rating
            if remarks is None:
                remarks = self.instance.remarks

        if job_rating and job_rating != ProductionReport.RATING_EXCELLENT:
            if not remarks or not remarks.strip():
                raise serializers.ValidationError({
                    "remarks": f"Remarks are mandatory when job rating is {dict(ProductionReport.RATING_CHOICES).get(job_rating, job_rating)}."
                })

        # Completion is only allowed when the finished quantity exactly matches the target.
        produced_quantity = data.get('produced_quantity')
        status = data.get('status')
        
        if self.instance:
            if produced_quantity is None:
                produced_quantity = self.instance.produced_quantity
            if status is None:
                status = self.instance.status

        if self.instance and produced_quantity is not None:
            try:
                current_total = int(self.instance.produced_quantity or 0)
                incoming_value = int(produced_quantity) if produced_quantity else 0

                data['produced_quantity'] = current_total + incoming_value if current_total > 0 else incoming_value
            except (ValueError, TypeError):
                pass

        if self.instance:
            if 'operator_working_hours' in data:
                current_value = Decimal(str(self.instance.operator_working_hours or 0))
                incoming_value = Decimal(str(data['operator_working_hours'])) if data['operator_working_hours'] not in [None, ''] else Decimal('0.00')
                data['operator_working_hours'] = current_value + incoming_value

            if 'parts_made_in_working_hours' in data:
                current_value = int(self.instance.parts_made_in_working_hours or 0)
                incoming_value = int(data['parts_made_in_working_hours']) if data['parts_made_in_working_hours'] not in [None, ''] else 0
                data['parts_made_in_working_hours'] = current_value + incoming_value

            if 'operator_overtime_hours' in data:
                current_value = Decimal(str(self.instance.operator_overtime_hours or 0))
                incoming_value = Decimal(str(data['operator_overtime_hours'])) if data['operator_overtime_hours'] not in [None, ''] else Decimal('0.00')
                data['operator_overtime_hours'] = current_value + incoming_value

            if 'parts_made_in_overtime' in data:
                current_value = int(self.instance.parts_made_in_overtime or 0)
                incoming_value = int(data['parts_made_in_overtime']) if data['parts_made_in_overtime'] not in [None, ''] else 0
                data['parts_made_in_overtime'] = current_value + incoming_value

            if 'idle_time_hours' in data:
                current_value = Decimal(str(self.instance.idle_time_hours or 0))
                incoming_value = Decimal(str(data['idle_time_hours'])) if data['idle_time_hours'] not in [None, ''] else Decimal('0.00')
                data['idle_time_hours'] = current_value + incoming_value

            if 'idle_reason' in data and data['idle_reason'] not in [None, '']:
                existing_reason = self.instance.idle_reason or ''
                incoming_reason = str(data['idle_reason']).strip()
                combined_reason = f"{existing_reason}; {incoming_reason}".strip().strip(';')
                data['idle_reason'] = combined_reason

        required_quantity = data.get('required_quantity') or (self.instance.required_quantity if self.instance else None)
        effective_produced_quantity = data.get('produced_quantity')
        
        if effective_produced_quantity is not None and required_quantity is not None:
            try:
                produced_qty_int = int(effective_produced_quantity) if effective_produced_quantity else 0
                required_qty_int = int(required_quantity) if required_quantity else 0

                if produced_qty_int >= required_qty_int:
                    data['status'] = status or ProductionReport.STATUS_COMPLETED
                else:
                    data['status'] = ProductionReport.STATUS_IN_PROGRESS
            except (ValueError, TypeError):
                # If conversion fails, just continue without forcing status
                pass

        if self.instance and any(key in data for key in ['produced_quantity', 'operator_working_hours', 'parts_made_in_working_hours', 'operator_overtime_hours', 'parts_made_in_overtime', 'idle_time_hours', 'idle_reason', 'status', 'job_rating', 'remarks', 'scrap_quantity']):
            existing_logs = list(self.instance.entry_logs or [])
            entry = {
                'entry_number': len(existing_logs) + 1,
                'saved_at': timezone.now().isoformat(),
                'delta': {
                    'produced_quantity': int(data.get('produced_quantity', self.instance.produced_quantity or 0)) - int(self.instance.produced_quantity or 0) if 'produced_quantity' in data else 0,
                    'operator_working_hours': float(Decimal(str(data.get('operator_working_hours', self.instance.operator_working_hours or 0))) - Decimal(str(self.instance.operator_working_hours or 0))) if 'operator_working_hours' in data else 0,
                    'parts_made_in_working_hours': int(data.get('parts_made_in_working_hours', self.instance.parts_made_in_working_hours or 0)) - int(self.instance.parts_made_in_working_hours or 0) if 'parts_made_in_working_hours' in data else 0,
                    'operator_overtime_hours': float(Decimal(str(data.get('operator_overtime_hours', self.instance.operator_overtime_hours or 0))) - Decimal(str(self.instance.operator_overtime_hours or 0))) if 'operator_overtime_hours' in data else 0,
                    'parts_made_in_overtime': int(data.get('parts_made_in_overtime', self.instance.parts_made_in_overtime or 0)) - int(self.instance.parts_made_in_overtime or 0) if 'parts_made_in_overtime' in data else 0,
                    'idle_time_hours': float(Decimal(str(data.get('idle_time_hours', self.instance.idle_time_hours or 0))) - Decimal(str(self.instance.idle_time_hours or 0))) if 'idle_time_hours' in data else 0,
                    'idle_reason': data.get('idle_reason', self.instance.idle_reason or '') if 'idle_reason' in data else '',
                },
                'totals': {
                    'produced_quantity': int(data.get('produced_quantity', self.instance.produced_quantity or 0)),
                    'operator_working_hours': float(data.get('operator_working_hours', self.instance.operator_working_hours or 0)),
                    'parts_made_in_working_hours': int(data.get('parts_made_in_working_hours', self.instance.parts_made_in_working_hours or 0)),
                    'operator_overtime_hours': float(data.get('operator_overtime_hours', self.instance.operator_overtime_hours or 0)),
                    'parts_made_in_overtime': int(data.get('parts_made_in_overtime', self.instance.parts_made_in_overtime or 0)),
                    'idle_time_hours': float(data.get('idle_time_hours', self.instance.idle_time_hours or 0)),
                    'idle_reason': data.get('idle_reason', self.instance.idle_reason or ''),
                },
                'status': data.get('status', self.instance.status),
                'job_rating': data.get('job_rating', self.instance.job_rating),
                'remarks': data.get('remarks', self.instance.remarks),
                'scrap_quantity': int(data.get('scrap_quantity', self.instance.scrap_quantity or 0)),
            }
            existing_logs.append(entry)
            data['entry_logs'] = existing_logs

        return data
