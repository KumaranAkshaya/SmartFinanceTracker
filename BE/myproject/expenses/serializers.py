from rest_framework import serializers
from .models import *


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = "__all__"
        read_only_fields = ["user", "created_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_type = serializers.CharField(source="category.category_type", read_only=True)

    class Meta:
        model = Expense
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]


class EMILoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = EMILoan
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]


class SavingSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Saving
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]

    def get_progress_percentage(self, obj):
        if obj.target_amount and obj.target_amount > 0:
            return round((obj.current_amount / obj.target_amount) * 100, 2)
        return 0.0


class InvestmentSerializer(serializers.ModelSerializer):
    gain_loss = serializers.SerializerMethodField()

    class Meta:
        model = Investment
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]

    def get_gain_loss(self, obj):
        return round(obj.current_value - obj.invested_amount, 2)


class EmergencyExpenseSerializer(serializers.ModelSerializer):
    net_amount = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyExpense
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]

    def get_net_amount(self, obj):
        return round(obj.amount - obj.insurance_claim_amount, 2)