from rest_framework import generics
from .models import Inventory
from .serializers import InventorySerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE
from django.contrib.contenttypes.models import ContentType
from django.utils.encoding import force_str


class InventoryView(generics.ListCreateAPIView):
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Inventory.objects.all()

    def perform_create(self, serializer):
        obj = serializer.save()
        LogEntry.objects.log_action(
            user_id=self.request.user.id,
            content_type_id=ContentType.objects.get_for_model(Inventory).pk,
            object_id=force_str(obj.pk),
            object_repr=force_str(obj),
            action_flag=ADDITION,
            change_message="Created via API",
        )


class InventoryDetailView(generics.RetrieveUpdateAPIView):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        obj = serializer.save()
        LogEntry.objects.log_action(
            user_id=self.request.user.id,
            content_type_id=ContentType.objects.get_for_model(Inventory).pk,
            object_id=force_str(obj.pk),
            object_repr=force_str(obj),
            action_flag=CHANGE,
            change_message="Updated via API",
        )

class InventoryDestroyView(generics.DestroyAPIView):
    queryset = Inventory.objects.all()
    permission_classes = [IsAuthenticated]