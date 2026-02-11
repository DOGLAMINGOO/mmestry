from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Client
from .serializers import ClientSerializer


class ClientListView(generics.ListAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
from django.shortcuts import render

# Create your views here.
