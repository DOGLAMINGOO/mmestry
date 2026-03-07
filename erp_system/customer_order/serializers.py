from rest_framework import serializers

from .models import CustomerOrder


class CustomerOrderSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    part_name = serializers.CharField(source="part.name", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

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
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "po_number",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        # Set created_by from the authenticated user
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)
