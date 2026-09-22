from django.contrib import admin
from .models import Budget, BudgetAlert


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "category", "month", "year", "limit_amount", "spent_amount", "is_exceeded", "alert_threshold"]
    list_filter = ["month", "year", "is_exceeded"]
    search_fields = ["user__email", "category__name"]


@admin.register(BudgetAlert)
class BudgetAlertAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "budget", "alert_type", "is_read", "created_at"]
    list_filter = ["alert_type", "is_read"]
    search_fields = ["user__email", "message"]