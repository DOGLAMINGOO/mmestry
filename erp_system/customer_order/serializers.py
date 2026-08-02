from rest_framework import serializers

from .models import CustomerOrder, CustomerOrderLog


class CustomerOrderLogSerializer(serializers.ModelSerializer):
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = CustomerOrderLog
        fields = (
            "id",
            "customer_order",
            "po_number",
            "company_name",
            "client_name",
            "part_name",
            "quantity",
            "deadline",
            "priority",
            "status",
            "status_display",
            "action_type",
            "action_type_display",
            "reason",
            "created_by",
            "created_by_username",
            "created_at",
        )


class CustomerOrderSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    part_name = serializers.CharField(source="part.name", read_only=True)
    part_description = serializers.CharField(source="part.description", read_only=True, default="")
    part_number = serializers.CharField(source="part.part_number", read_only=True, default="")
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    last_edited_by_username = serializers.CharField(source="last_edited_by.username", read_only=True)
    remaining_quantity = serializers.SerializerMethodField()

    class Meta:
        model = CustomerOrder
        fields = (
            "id",
            "po_number",
            "po_date",
            "company",
            "company_name",
            "client",
            "client_name",
            "part",
            "part_name",
            "part_description",
            "part_number",
            "quantity",
            "shipped_quantity",
            "remaining_quantity",
            "deadline",
            "priority",
            "status",
            "is_short_closed",
            "last_edit_reason",
            "created_by",
            "created_by_username",
            "last_edited_by",
            "last_edited_by_username",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "created_by",
            "created_by_username",
            "last_edited_by",
            "last_edited_by_username",
            "created_at",
            "updated_at",
            "shipped_quantity",
            "is_short_closed",
        )

    def get_remaining_quantity(self, obj):
        """Calculate remaining quantity to be shipped"""
        return obj.quantity - obj.shipped_quantity

    def validate(self, data):
        if not data.get("po_number") or not str(data.get("po_number")).strip():
            raise serializers.ValidationError({"po_number": "PO number must be entered manually and cannot be blank."})
        if not data.get("po_date"):
            raise serializers.ValidationError({"po_date": "Order date must be provided."})
        return data

    def create(self, validated_data):
        # Set created_by from the authenticated user
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        order = super().create(validated_data)
        self._create_log(order, action_type=CustomerOrderLog.CREATED, reason="Created via API", user=request.user if request else None)
        return order

    def update(self, instance, validated_data):
        # Require last_edit_reason on any update operation
        reason = validated_data.get("last_edit_reason", "").strip()
        if not reason:
            raise serializers.ValidationError({"last_edit_reason": "A reason for the edit must be provided."})

        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["last_edited_by"] = request.user

        previous_status = instance.status
        result = super().update(instance, validated_data)

        action_type = CustomerOrderLog.EDITED
        if previous_status != result.status:
            action_type = CustomerOrderLog.STATUS_CHANGED

        self._create_log(
            result,
            action_type=action_type,
            reason=reason,
            user=request.user if request else None,
        )
        return result

    def _create_log(self, order, action_type, reason=None, user=None):
        from .models import CustomerOrderLog

        CustomerOrderLog.objects.create(
            customer_order=order,
            po_number=order.po_number,
            company_name=order.company.name,
            client_name=order.client.name,
            part_name=order.part.name,
            quantity=order.quantity,
            deadline=order.deadline,
            priority=order.priority,
            status=order.status,
            action_type=action_type,
            reason=reason,
            created_by=user if user and user.is_authenticated else None,
        )
