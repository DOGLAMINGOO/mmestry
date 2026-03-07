from django.db import models

# Create your models here.
class Company(models.Model):
    code = models.CharField(max_length=1, unique=True)  # A or B
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} - {self.code}"


class Client(models.Model):
    name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.name
    

class Part(models.Model):
    part_number = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    cycle_time_minutes = models.PositiveIntegerField()
    
    

    def __str__(self):
        return f"{self.part_number} - {self.name}"
    