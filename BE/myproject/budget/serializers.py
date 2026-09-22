from rest_framework import serializers
from .models import Budget, BudgetAlert
from expenses.serializers import ExpenseCategorySerializer


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_type = serializers.CharField(source="category.category_type", read_only=True)
    remaining_amount = serializers.ReadOnlyField()
    usage_percentage = serializers.ReadOnlyField()
    is_alert_triggered = serializers.ReadOnlyField()

    class Meta:
        model = Budget
        fields = "__all__"
        read_only_fields = ["user", "spent_amount", "is_exceeded", "created_at", "updated_at"]


class BudgetAlertSerializer(serializers.ModelSerializer):
    budget_category = serializers.CharField(source="budget.category.name", read_only=True)
    budget_month = serializers.IntegerField(source="budget.month", read_only=True)
    budget_year = serializers.IntegerField(source="budget.year", read_only=True)

    class Meta:
        model = BudgetAlert
        fields = "__all__"
        read_only_fields = ["user", "budget", "alert_type", "message", "created_at"]