from django.db import models
from core.models import Company, Part
from clients.models import Client

class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("IN_PRODUCTION", "In Production"),
        ("QC", "QC"),
        ("DISPATCHED", "Dispatched"),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)

    quantity = models.PositiveIntegerField()
    deadline = models.DateField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PO-{self.id} | {self.client}"
