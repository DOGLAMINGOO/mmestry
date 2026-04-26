from rest_framework import serializers
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from .models import Inventory, StockReceipt


class InventorySerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source="part.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    # replaced added_by/updated_by with last adjustment info (annotated in queryset)
    last_adjusted_by = serializers.CharField(read_only=True)
    last_adjusted_at = serializers.DateTimeField(read_only=True)
    reserved_blanks = serializers.IntegerField(source="reserved_blanks_qty", read_only=True, default=0)
    available_blanks = serializers.IntegerField(read_only=True)

    class Meta:
        model = Inventory
        # expose only necessary fields; quantities are read-only
        fields = (
            "id",
            "company",
            "company_name",
            "part",
            "part_name",
            "total_blanks",
            "finished_blanks",
            "reserved_blanks",
            "available_blanks",
            "last_adjusted_by",
            "last_adjusted_at",
        )
        read_only_fields = (
            "total_blanks",
            "finished_blanks",
            "reserved_blanks",
            "available_blanks",
            "last_adjusted_by",
            "last_adjusted_at",
        )
        # We implement our own unique-together check so updates work cleanly.
        validators = []

    def validate(self, data):
        """
        Enforce unique (company, part) while allowing:
        - Creating a new record if combination doesn't exist.
        - Updating quantities on the SAME record without error.
        """
        # For partial updates, fall back to instance values when not provided
        company = data.get("company", getattr(self.instance, "company", None))
        part = data.get("part", getattr(self.instance, "part", None))

        if company and part:
            qs = Inventory.objects.filter(company=company, part=part)
            # When editing, ignore the current instance
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            "Inventory with this Company and Part already exists."
                        ]
                    }
                )

        return data

    # `last_adjusted_by` and `last_adjusted_at` are provided by queryset annotations

    def create(self, validated_data):
        # Prevent clients from setting quantities during creation.
        # Ensure total_blanks/finished_blanks default to model defaults (0).
        for field in ("total_blanks", "finished_blanks"):
            validated_data.pop(field, None)

        # validated_data should only contain company and part (and any allowed fields)
        return Inventory.objects.create(**validated_data)

    def update(self, instance, validated_data):
        # Prevent manual edits to quantity via API
        for field in ("total_blanks", "finished_blanks"):
            if field in validated_data:
                validated_data.pop(field, None)
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # available = total - reserved
        # Handle potential None values defensively
        total = representation.get('total_blanks') or 0
        reserved = representation.get('reserved_blanks') or 0
        representation['available_blanks'] = total - reserved
        return representation


class StockReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockReceipt
        fields = "__all__"
        read_only_fields = ("received_by", "received_at")
