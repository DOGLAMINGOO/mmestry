from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Company, Part
from .serializers import CompanySerializer, PartSerializer



class CompanyListView(generics.ListAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

class PartListView(generics.ListAPIView):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [IsAuthenticated]
