from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Company, Part, Client, Machine, Operator
from .serializers import CompanySerializer, PartSerializer, ClientSerializer, MachineSerializer, OperatorSerializer



class CompanyListView(generics.ListAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

class PartListView(generics.ListAPIView):
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [IsAuthenticated]


class ClientListView(generics.ListAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

class MachineListView(generics.ListAPIView):
    queryset = Machine.objects.filter(is_active=True)
    serializer_class = MachineSerializer
    permission_classes = [IsAuthenticated]

class OperatorListView(generics.ListAPIView):
    queryset = Operator.objects.filter(is_active=True)
    serializer_class = OperatorSerializer
    permission_classes = [IsAuthenticated]
