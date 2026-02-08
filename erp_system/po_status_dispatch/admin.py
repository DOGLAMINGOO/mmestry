from django.contrib import admin
from .models import QCReport, Dispatch

# Register your models here.

admin.site.register(QCReport)
admin.site.register(Dispatch)