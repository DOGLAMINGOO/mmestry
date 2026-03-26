from .models import Company, Part, Client, Machine, Operator
from rest_framework import serializers

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'code', 'name']

class PartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Part
        fields = ['id', 'part_number', 'name', 'cycle_time_minutes']


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "name"]

class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = ["id", "name", "is_active"]

class OperatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operator
        fields = ["id", "name", "is_active"]