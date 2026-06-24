from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Part, Company
from .models import Inventory


@receiver(post_save, sender=Part)
def create_inventory_for_new_part(sender, instance, created, **kwargs):
    if not created:
        return
    # Create an Inventory record for every company for this part
    for company in Company.objects.all():
        Inventory.objects.get_or_create(
            company=company,
            part=instance,
            defaults={
                "total_blanks": 0,
                "finished_blanks": 0,
            },
        )
