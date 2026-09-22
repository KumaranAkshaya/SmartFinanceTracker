from django.db import models
from user.models import CustomUser
from expenses.models import ExpenseCategory


class Budget(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="budgets")
    category = models.ForeignKey(ExpenseCategory, on_delete=models.CASCADE, related_name="budgets")
    month = models.PositiveIntegerField()   # 1–12
    year = models.PositiveIntegerField()
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    spent_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    alert_threshold = models.PositiveIntegerField(default=80)   # % at which alert fires
    is_exceeded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "category", "month", "year")
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"{self.category.name} - {self.month}/{self.year}"

    @property
    def remaining_amount(self):
        return self.limit_amount - self.spent_amount

    @property
    def usage_percentage(self):
        if self.limit_amount > 0:
            return round((self.spent_amount / self.limit_amount) * 100, 2)
        return 0.0

    @property
    def is_alert_triggered(self):
        return self.usage_percentage >= self.alert_threshold


class BudgetAlert(models.Model):
    ALERT_TYPES = [
        ("threshold", "Threshold Reached"),   # e.g. 80% crossed
        ("exceeded", "Budget Exceeded"),       # 100%+ crossed
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="budget_alerts")
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="alerts")
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.alert_type} - {self.budget}"