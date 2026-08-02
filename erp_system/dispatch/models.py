from django.db import models
from django.conf import settings
from customer_order.models import CustomerOrder

class DispatchHistory(models.Model):
    """
    Persistent record of every dispatch event.
    Stores snapshots of order details to preserve history even if master records change.
    """
    order = models.ForeignKey(
        CustomerOrder, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name="dispatch_history"
    )
    parent_dispatch = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supplementary_dispatches'
    )
    
    # Snapshots for historical integrity
    po_number = models.CharField(max_length=50)
    client_name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255)
    part_name = models.CharField(max_length=255)

    ordered_quantity = models.PositiveIntegerField(default=0)
    actual_shipped_quantity = models.PositiveIntegerField(default=0)
    shipped_quantity = models.PositiveIntegerField()
    main_invoice_pdf = models.FileField(upload_to="dispatch_invoices/", null=True, blank=True)
    main_qc_report_pdf = models.FileField(upload_to="qc_reports/", null=True, blank=True)
    qc_report = models.FileField(upload_to="qc_reports/", null=True, blank=True)
    is_short_closed = models.BooleanField(default=False)
    has_supplementary = models.BooleanField(default=False)
    supplementary_shipped_quantity = models.PositiveIntegerField(default=0)
    supplementary_invoice_pdf = models.FileField(upload_to="dispatch_invoices/", null=True, blank=True)
    supplementary_qc_report_pdf = models.FileField(upload_to="qc_reports/", null=True, blank=True)
    
    dispatched_at = models.DateTimeField(auto_now_add=True)
    dispatched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name="dispatch_history_entries"
    )

    class Meta:
        verbose_name_plural = "Dispatch Histories"
        ordering = ['-dispatched_at']

    def __str__(self):
        return f"History: {self.po_number} - {self.shipped_quantity} units"

class DispatchOrder(CustomerOrder):
    class Meta:
        proxy = True
        verbose_name = "Dispatch (Ready/Partial)"
        verbose_name_plural = "Dispatch (Ready/Partial)"
