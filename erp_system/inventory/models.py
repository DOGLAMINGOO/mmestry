from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction


class Inventory(models.Model):
    """
    Stores stock levels for parts associated with a specific company.
    """

    company = models.ForeignKey(
        "core.Company", on_delete=models.CASCADE, related_name="inventory"
    )
    part = models.ForeignKey(
        "core.Part", on_delete=models.CASCADE, related_name="inventory"
    )

    # Renamed/Added fields as per requirements
    total_blanks = models.PositiveIntegerField(
        default=0, help_text="Total raw blanks in stock."
    )
    finished_blanks = models.PositiveIntegerField(
        default=0, help_text="Total finished parts in stock."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("company", "part")
        verbose_name_plural = "Inventories"

    def __str__(self):
        return f"{self.company.name} - {self.part.name}"

    @property
    def reserved_blanks(self):
        """
        Calculates reserved blanks based on orders that are approved or in production.
        """
        from customer_order.models import CustomerOrder

        active_orders = CustomerOrder.objects.filter(
            company=self.company,
            part=self.part,
            status__in=[
                CustomerOrder.STATUS_APPROVED,
                CustomerOrder.STATUS_IN_PRODUCTION,
            ],
            is_deleted=False,
        )
        return sum(order.quantity for order in active_orders)

    @property
    def available_blanks(self):
        return (self.total_blanks or 0) - self.reserved_blanks

    def _create_log(self, change_type, qty, user, reason=None):
        InventoryLog.objects.create(
            inventory=self,
            change_type=change_type,
            quantity=qty,
            reason=reason,
            created_by=user if user is not None else None,
        )

    def increase_blanks(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            self.total_blanks = (self.total_blanks or 0) + int(qty)
            self.save()
            self._create_log(change_type, qty, user, reason)

    def decrease_blanks(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            if (self.total_blanks or 0) < int(qty):
                raise ValidationError("Insufficient blanks to decrease")
            self.total_blanks = (self.total_blanks or 0) - int(qty)
            self.save()
            self._create_log(change_type, -int(qty), user, reason)

    def increase_finished(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            self.finished_blanks = (self.finished_blanks or 0) + int(qty)
            self.save()
            self._create_log(change_type, qty, user, reason)

    def decrease_finished(self, qty, user, change_type, reason=None):
        if qty <= 0:
            raise ValidationError("Quantity must be positive")
        with transaction.atomic():
            if (self.finished_blanks or 0) < int(qty):
                raise ValidationError("Insufficient finished stock to decrease")
            self.finished_blanks = (self.finished_blanks or 0) - int(qty)
            self.save()
            self._create_log(change_type, -int(qty), user, reason)


class InventoryLog(models.Model):
    """
    Audit trail for every stock movement.
    """

    PO_RECEIVED = "PO_RECEIVED"
    PRODUCTION_USED = "PRODUCTION_USED"
    PRODUCTION_CREATED = "PRODUCTION_CREATED"
    DISPATCHED = "DISPATCHED"
    SALES_OUT = "SALES_OUT"
    ADJUSTMENT = "ADJUSTMENT"

    CHANGE_TYPE_CHOICES = [
        (PO_RECEIVED, "PO Received"),
        (PRODUCTION_USED, "Production Used"),
        (PRODUCTION_CREATED, "Production Created"),
        (DISPATCHED, "Dispatched"),
        (SALES_OUT, "Sales Out"),
        (ADJUSTMENT, "Adjustment"),
    ]

    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name="logs")
    change_type = models.CharField(max_length=32, choices=CHANGE_TYPE_CHOICES)
    quantity = models.IntegerField(help_text="Positive for increase, negative for decrease.")
    reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        verbose_name = "Inventory Log"
        verbose_name_plural = "Inventory Logs"
        ordering = ["-created_at"]

    def __str__(self):
        inventory_label = f"{self.inventory.company.name} / {self.inventory.part.name}" if self.inventory_id else "Unknown inventory"
        return f"{self.get_change_type_display()} - {inventory_label} ({self.quantity})"


class StockReceipt(models.Model):
    """
    Logs incoming stock shipments (Purchase Orders received).
    """
    company = models.ForeignKey("core.Company", on_delete=models.CASCADE)
    part = models.ForeignKey("core.Part", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    supplier_name = models.CharField(max_length=255)
    invoice_number = models.CharField(max_length=100)
    received_at = models.DateTimeField(auto_now_add=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Receipt {self.invoice_number} - {self.part.name}"