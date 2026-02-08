from django.db import models
from core.models import Company, Part
from purchase_orders.models import PurchaseOrder

class Production(models.Model):
    REMARK_CHOICES = [
        ("EXCELLENT", "Excellent"),
        ("GOOD", "Good"),
        ("POOR", "Poor"),
        ("VERY_POOR", "Very Poor"),
    ]

    po = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)

    batch_number = models.CharField(max_length=50)  # new field

    target_qty = models.PositiveIntegerField()
    produced_qty = models.PositiveIntegerField(default=0)

    start_date = models.DateField()
    completed_at = models.DateTimeField(null=True, blank=True)

    remarks = models.CharField(
        max_length=20,
        choices=REMARK_CHOICES,
        blank=True
    )
    feedback = models.TextField(blank=True)

    def __str__(self):
        return f"Production {self.id} | PO {self.po.id} | Batch {self.batch_number}"
