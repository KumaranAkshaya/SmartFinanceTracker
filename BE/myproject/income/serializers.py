from rest_framework import serializers
from .models import *


class IncomeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeCategory
        fields = "__all__"
        read_only_fields = ["user", "created_at"]


class SalaryStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryStructure
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]


class IncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    company_name = serializers.CharField(source="salary_structure.company_name", read_only=True)

    class Meta:
        model = Income
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]