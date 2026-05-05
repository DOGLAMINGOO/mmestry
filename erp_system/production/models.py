from django.db import models
from django.conf import settings
from customer_order.models import CustomerOrder

class ProductionReport(models.Model):
    """
    Tracks the production progress for a specific Customer Order.
    """
    
    STATUS_IN_PROGRESS = "IN_PROGRESS"
    STATUS_COMPLETED = "COMPLETED"
    
    STATUS_CHOICES = [
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
    ]
    
    RATING_EXCELLENT = "EXCELLENT"
    RATING_VERY_GOOD = "VERY_GOOD"
    RATING_GOOD = "GOOD"
    RATING_POOR = "POOR"
    
    RATING_CHOICES = [
        (RATING_EXCELLENT, "Excellent"),
        (RATING_VERY_GOOD, "Very Good"),
        (RATING_GOOD, "Good"),
        (RATING_POOR, "Poor"),
    ]

    # Link to the Customer Order
    customer_order = models.OneToOneField(
        CustomerOrder, 
        on_delete=models.CASCADE, 
        related_name="production_report",
        help_text="The approved customer order this report belongs to."
    )
    
    # Core Production Info
    machine_name = models.CharField(max_length=255)
    operator_name = models.CharField(max_length=255)
    deadline = models.DateField(help_text="Target completion date")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS)
    
    # Quantities
    required_quantity = models.PositiveIntegerField()
    produced_quantity = models.PositiveIntegerField(null=True, blank=True)
    scrap_quantity = models.PositiveIntegerField(default=0)
    
    # Time & Effort Logging
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    
    operator_working_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    parts_made_in_working_hours = models.PositiveIntegerField(null=True, blank=True)
    
    operator_overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, default=0.00)
    parts_made_in_overtime = models.PositiveIntegerField(null=True, blank=True, default=0)
    
    idle_time_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, default=0.00)
    idle_reason = models.TextField(blank=True, null=True, help_text="Mandatory if idle_time_hours > 0")
    
    # Quality & Feedback
    job_rating = models.CharField(max_length=20, choices=RATING_CHOICES, null=True, blank=True)
    remarks = models.TextField(blank=True, null=True, help_text="Mandatory if job rating is less than Excellent")
    
    # Auditing
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_production_reports"
    )
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="edited_production_reports"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        
    def __str__(self):
        return f"Production Report for {self.customer_order.po_number}"

class ProductionOrder(CustomerOrder):
    class Meta:
        proxy = True
        verbose_name = "Production (Approved/In-Progress)"
        verbose_name_plural = "Production (Approved/In-Progress)"
