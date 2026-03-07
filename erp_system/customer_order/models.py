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
    STATUS_DISPATCHED = "DISPATCHED"
    STATUS_CLOSED = "CLOSED"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_IN_PRODUCTION, "In production"),
        (STATUS_READY_FOR_DISPATCH, "Ready for dispatch"),
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
        max_length=20,
        unique=True,
        editable=False,
        help_text="Auto-generated purchase order number (e.g. PO-A-001).",
    )
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="customer_orders")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="customer_orders")
    part = models.ForeignKey(Part, on_delete=models.PROTECT, related_name="customer_orders")
    quantity = models.PositiveIntegerField()
    deadline = models.DateField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_DRAFT)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_customer_orders",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.po_number or f"Order for {self.client} ({self.part})"

    def _generate_po_number(self) -> str:
        """
        Generate a new PO number in the format PO-<company.code>-NNN.
        Sequence is per company based on the last existing order.
        """
        prefix = f"PO-{self.company.code}-"
        last_order = (
            CustomerOrder.objects.filter(company=self.company, po_number__startswith=prefix)
            .order_by("-po_number")
            .first()
        )

        last_seq = 0
        if last_order and last_order.po_number:
            # Expect format PO-<code>-NNN
            try:
                last_seq = int(last_order.po_number.split("-")[-1])
            except (ValueError, IndexError):
                last_seq = 0

        next_seq = last_seq + 1
        return f"{prefix}{next_seq:03d}"

    def save(self, *args, **kwargs):
        # Auto-generate PO number on first save
        if not self.po_number and self.company_id:
            self.po_number = self._generate_po_number()
        super().save(*args, **kwargs)

