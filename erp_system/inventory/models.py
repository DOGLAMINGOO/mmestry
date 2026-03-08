from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.conf import settings
from core.models import Company, Part


class Inventory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)
    blanks_qty = models.PositiveIntegerField(default=0)
    finished_qty = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("company", "part")

    def __str__(self):
        return f"{self.company} | {self.part}"



    def clean(self):
        errors = {}
        if self.blanks_qty is not None and self.blanks_qty < 0:
            errors["blanks_qty"] = "blanks_qty must be >= 0"
        if self.finished_qty is not None and self.finished_qty < 0:
            errors["finished_qty"] = "finished_qty must be >= 0"
        # Note: reserved quantity and related checks removed for now

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # enforce validation at model level
        self.clean()
        return super().save(*args, **kwargs)

    # Helper methods to change stock and create logs
    def _create_log(self, change_type, qty, user, reason=None):
        InventoryLog.objects.create(
            inventory=self,
            change_type=change_type,
            quantity_changed=qty,
            reason=reason if reason else None,
            created_by=user if user is not None else None,
        )       

    def increase_blanks(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            self.blanks_qty = (self.blanks_qty or 0) + int(qty)
            self.save()
            self._create_log(change_type, qty, user, reason)

    def decrease_blanks(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            if (self.blanks_qty or 0) < int(qty):
                raise ValidationError("Insufficient blanks to decrease")
            self.blanks_qty = (self.blanks_qty or 0) - int(qty)
            self.save()
            self._create_log(change_type, -int(qty), user, reason)

    def increase_finished(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            self.finished_qty = (self.finished_qty or 0) + int(qty)
            self.save()
            self._create_log(change_type, qty, user, reason)

    def decrease_finished(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            if (self.finished_qty or 0) < int(qty):
                raise ValidationError("Insufficient finished stock to decrease")
            self.finished_qty = (self.finished_qty or 0) - int(qty)
            self.save()
            self._create_log(change_type, -int(qty), user, reason)

    # Reservation-related helpers removed for now; will add when dispatch app exists


class InventoryLog(models.Model):
    PO_RECEIVED = "PO_RECEIVED"
    PRODUCTION_USED = "PRODUCTION_USED"
    PRODUCTION_CREATED = "PRODUCTION_CREATED"
    DISPATCHED = "DISPATCHED"
    ADJUSTMENT = "ADJUSTMENT"

    CHANGE_TYPE_CHOICES = [
        (PO_RECEIVED, "PO Received"),
        (PRODUCTION_USED, "Production Used"),
        (PRODUCTION_CREATED, "Production Created"),
        (DISPATCHED, "Dispatched"),
        (ADJUSTMENT, "Adjustment"),
    ]

    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name="logs")
    change_type = models.CharField(max_length=32, choices=CHANGE_TYPE_CHOICES)
    quantity_changed = models.IntegerField()
    reason = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.inventory} {self.change_type} {self.quantity_changed}"
        