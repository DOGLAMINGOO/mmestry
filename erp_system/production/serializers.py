from rest_framework import serializers
from .models import ProductionReport
from customer_order.models import CustomerOrder
from customer_order.serializers import CustomerOrderSerializer

class ProductionReportSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    last_edited_by_username = serializers.CharField(source='last_edited_by.username', read_only=True)
    
    # Read-only nested representation of the Customer Order for the frontend to display details
    customer_order_details = CustomerOrderSerializer(source='customer_order', read_only=True)

    class Meta:
        model = ProductionReport
        fields = '__all__'
        read_only_fields = ['created_by', 'last_edited_by', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Custom validation rules as requested by the user.
        """
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

        return data
