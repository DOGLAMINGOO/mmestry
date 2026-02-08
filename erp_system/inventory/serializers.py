from rest_framework import serializers
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from .models import Inventory


class InventorySerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source="part.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    added_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = "__all__"
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

    def _get_log_user(self, obj, action_flag):
        ct = ContentType.objects.get_for_model(Inventory)
        entry = (
            LogEntry.objects.filter(
                content_type=ct,
                object_id=str(obj.pk),
                action_flag=action_flag,
            )
            .select_related("user")
            .order_by("-action_time")
            .first()
        )
        if not entry or not entry.user:
            return None
        return entry.user.get_username()

    def get_added_by(self, obj):
        return self._get_log_user(obj, ADDITION)

    def get_updated_by(self, obj):
        # If never updated, this may be None; frontend can display '-'
        return self._get_log_user(obj, CHANGE)
