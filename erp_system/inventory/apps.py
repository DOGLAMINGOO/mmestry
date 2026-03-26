from django.apps import AppConfig


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'
    def ready(self):
        # import signal handlers
        try:
            from . import signals  
        except Exception:
            pass
