from django.db import models
from core.models import Company, Part

class Inventory(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    part = models.ForeignKey(Part, on_delete=models.CASCADE)

    blanks_qty = models.PositiveIntegerField(default=0)
    finished_qty = models.PositiveIntegerField(default=0)
    reserved_qty = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    
    class Meta:
        unique_together = ("company", "part")
        
        
    def __str__(self):
        return f"{self.company} | {self.part}"
    