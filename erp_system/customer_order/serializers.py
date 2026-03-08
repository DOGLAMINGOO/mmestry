from rest_framework import serializers

from .models import CustomerOrder


class CustomerOrderSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    part_name = serializers.CharField(source="part.name", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    last_edited_by_username = serializers.CharField(source="last_edited_by.username", read_only=True)

    class Meta:
        model = CustomerOrder
        fields = (
            "id",
            "po_number",
            "company",
            "company_name",
            "client",
            "client_name",
            "part",
            "part_name",
            "quantity",
            "deadline",
            "priority",
            "status",
            "last_edit_reason",
            "created_by",
            "created_by_username",
            "last_edited_by",
            "last_edited_by_username",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "po_number",
            "created_by",
            "created_by_username",
            "last_edited_by",
            "last_edited_by_username",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        # Set created_by from the authenticated user
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Require last_edit_reason on any update operation
        reason = validated_data.get("last_edit_reason", "").strip()
        if not reason:
            raise serializers.ValidationError({"last_edit_reason": "A reason for the edit must be provided."})
        
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["last_edited_by"] = request.user

        return super().update(instance, validated_data)
