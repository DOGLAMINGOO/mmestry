from datetime import date

from django.db import models
from django.conf import settings

from core.models import Company, Client, Part


class CustomerOrder(models.Model):
    """
    Represents a customer purchase order.
    PO number format: PO-<company.code>-NNN (e.g. PO-A-001, PO-B-002).
    """

    # Status choices
    STATUS_DRAFT = "DRAFT"
    STATUS_APPROVED = "APPROVED"
    STATUS_IN_PRODUCTION = "IN_PRODUCTION"
    STATUS_READY_FOR_DISPATCH = "READY_FOR_DISPATCH"
    STATUS_PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED"
    STATUS_DISPATCHED = "DISPATCHED"
    STATUS_CLOSED = "CLOSED"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_IN_PRODUCTION, "In production"),
        (STATUS_READY_FOR_DISPATCH, "Ready for dispatch"),
        (STATUS_PARTIALLY_SHIPPED, "Partially shipped"),
        (STATUS_DISPATCHED, "Dispatched"),
        (STATUS_CLOSED, "Closed"),
    ]

    # Priority choices
    PRIORITY_LOW = "LOW"
    PRIORITY_MEDIUM = "MEDIUM"
    PRIORITY_HIGH = "HIGH"

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
    ]

    po_number = models.CharField(
        max_length=50,
        help_text="Purchase order number entered manually by the user.",
    )
    po_date = models.DateField(
        default=date.today,
        help_text="The officially registered order date.",
    )
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="customer_orders")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="customer_orders")
    part = models.ForeignKey(Part, on_delete=models.PROTECT, related_name="customer_orders")
    quantity = models.PositiveIntegerField()
    deadline = models.DateField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    last_edit_reason = models.TextField(blank=True, null=True, help_text="Reason for the last edit.")
    qc_report = models.FileField(upload_to="qc_reports/", null=True, blank=True)
    is_deleted = models.BooleanField(default=False, help_text="Soft deletion flag.")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_customer_orders",
    )
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="edited_customer_orders",
        help_text="The user who last edited this order.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.po_number or f"Order for {self.client} ({self.part})"
