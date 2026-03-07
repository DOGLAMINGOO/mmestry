from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0002_client"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomerOrder",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "po_number",
                    models.CharField(
                        editable=False,
                        help_text="Auto-generated purchase order number (e.g. PO-A-001).",
                        max_length=20,
                        unique=True,
                    ),
                ),
                ("quantity", models.PositiveIntegerField()),
                ("deadline", models.DateField()),
                (
                    "priority",
                    models.CharField(
                        choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High")],
                        default="MEDIUM",
                        max_length=10,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("DRAFT", "Draft"),
                            ("APPROVED", "Approved"),
                            ("IN_PRODUCTION", "In production"),
                            ("READY_FOR_DISPATCH", "Ready for dispatch"),
                            ("DISPATCHED", "Dispatched"),
                            ("CLOSED", "Closed"),
                        ],
                        default="DRAFT",
                        max_length=32,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="customer_orders",
                        to="core.client",
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="customer_orders",
                        to="core.company",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_customer_orders",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "part",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="customer_orders",
                        to="core.part",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]

