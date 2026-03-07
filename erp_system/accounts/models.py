from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    STOCK_MANAGER = "STOCK_MANAGER"

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (MANAGER, "Manager"),
        (STOCK_MANAGER, "Stock Manager"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=MANAGER,
    )

    def __str__(self):
        return f"{self.username} ({self.role})"