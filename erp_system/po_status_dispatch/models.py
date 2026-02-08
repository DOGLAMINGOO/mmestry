from django.db import models
# Create your models here.
from django.db import models
from purchase_orders.models import PurchaseOrder
from production.models import Production

class QCReport(models.Model):
    po = models.OneToOneField(PurchaseOrder, on_delete=models.CASCADE)
    report_file = models.FileField(upload_to="qc_reports/")
    status = models.BooleanField(default=False)  # True = Passed, False = Pending
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"QC for PO-{self.po.id}"

class Dispatch(models.Model):
    po = models.OneToOneField(PurchaseOrder, on_delete=models.CASCADE)
    dispatched = models.BooleanField(default=False)
    dispatch_date = models.DateField(null=True, blank=True)

    def can_dispatch(self):
        """
        Dispatch only if:
        1. Production for this PO is completed
        2. QC report uploaded and passed
        """
        try:
            qc = self.po.qcreport
            production_done = Production.objects.filter(po=self.po).exists()
            return qc.status and production_done
        except QCReport.DoesNotExist:
            return False

    def save(self, *args, **kwargs):
        if self.dispatched and not self.can_dispatch():
            raise ValueError("Cannot dispatch: QC pending or production not done")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Dispatch PO-{self.po.id} | {self.dispatched}"


