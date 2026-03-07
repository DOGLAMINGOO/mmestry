from rest_framework import serializers
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from .models import Inventory


class InventorySerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source="part.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    # replaced added_by/updated_by with last adjustment info (annotated in queryset)
    last_adjusted_by = serializers.CharField(read_only=True)
    last_adjusted_at = serializers.DateTimeField(read_only=True)
    # available_qty/ reserved removed for now

    class Meta:
        model = Inventory
        # expose only necessary fields; quantities are read-only
        fields = (
            "id",
            "company",
            "company_name",
            "part",
            "part_name",
            "blanks_qty",
            "finished_qty",
            "is_active",
            "last_adjusted_by",
            "last_adjusted_at",
        )
        read_only_fields = (
            "blanks_qty",
            "finished_qty",
            "is_active",
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
        # Prevent clients from setting quantities or is_active during creation.
        # Ensure blanks_qty/finished_qty default to model defaults (0).
        for field in ("blanks_qty", "finished_qty", "is_active"):
            validated_data.pop(field, None)

        # validated_data should only contain company and part (and any allowed fields)
        return Inventory.objects.create(**validated_data)

    def update(self, instance, validated_data):
        # Prevent manual edits to quantity and is_active via API
        for field in ("blanks_qty", "finished_qty", "is_active"):
            if field in validated_data:
                validated_data.pop(field, None)
        return super().update(instance, validated_data)
