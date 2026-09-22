from .models import Budget, BudgetAlert
from notifications.utils import notify_budget_alert


def update_budget_spent(user, category, month, year, amount, operation="add"):
    """
    Called from ExpenseView post/put/delete to keep spent_amount in sync.
    operation: "add" when expense is created, "subtract" when deleted.
    """
    budget = Budget.objects.filter(
        user=user,
        category=category,
        month=month,
        year=year
    ).first()

    if not budget:
        return

    if operation == "add":
        budget.spent_amount += amount
    elif operation == "subtract":
        budget.spent_amount = max(0, budget.spent_amount - amount)

    # Check exceeded flag
    budget.is_exceeded = budget.spent_amount > budget.limit_amount
    budget.save()

    # Fire alerts if needed
    _check_and_create_alert(budget)


def _check_and_create_alert(budget):
    usage = budget.usage_percentage

    # Threshold alert — fires once when threshold % is first crossed
    if usage >= budget.alert_threshold:
        already_exists = BudgetAlert.objects.filter(
            budget=budget,
            alert_type="threshold"
        ).exists()

        if not already_exists:
            BudgetAlert.objects.create(
                user=budget.user,
                budget=budget,
                alert_type="threshold",
                message=(
                    f"You have used {usage}% of your "
                    f"'{budget.category.name}' budget for "
                    f"{budget.month}/{budget.year}. "
                    f"Limit: ₹{budget.limit_amount}, "
                    f"Spent: ₹{budget.spent_amount}."
                )
            )
            notify_budget_alert(budget, alert_type="threshold")

    # Exceeded alert — fires once when 100% is crossed
    if budget.is_exceeded:
        already_exists = BudgetAlert.objects.filter(
            budget=budget,
            alert_type="exceeded"
        ).exists()

        if not already_exists:
            BudgetAlert.objects.create(
                user=budget.user,
                budget=budget,
                alert_type="exceeded",
                message=(
                    f"Budget exceeded for '{budget.category.name}' "
                    f"in {budget.month}/{budget.year}! "
                    f"Limit: ₹{budget.limit_amount}, "
                    f"Spent: ₹{budget.spent_amount}."
                )
            )
            notify_budget_alert(budget, "threshold") 