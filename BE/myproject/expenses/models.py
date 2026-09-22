from django.db import models
from user.models import CustomUser


class ExpenseCategory(models.Model):
    CATEGORY_TYPES = [
        ("fixed", "Fixed"),           # EMI, rent, subscriptions
        ("variable", "Variable"),     # groceries, fuel, utilities
        ("investment", "Investment"), # SIP, stocks, FD
        ("saving", "Saving"),         # emergency fund, goal-based
        ("emergency", "Emergency"),   # unexpected expenses
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="expense_categories")
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPES, default="variable")
    icon = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "name")
        ordering = ["category_type", "name"]

    def __str__(self):
        return f"{self.name} ({self.category_type})"


class Expense(models.Model):
    FREQUENCY_CHOICES = [
        ("one_time", "One Time"),
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="expenses")
    category = models.ForeignKey(ExpenseCategory, on_delete=models.CASCADE, related_name="expenses")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default="one_time")
    description = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-expense_date"]

    def __str__(self):
        return f"{self.category.name} - {self.amount}"


class EMILoan(models.Model):
    LOAN_TYPES = [
        ("home_loan", "Home Loan"),
        ("car_loan", "Car Loan"),
        ("personal_loan", "Personal Loan"),
        ("education_loan", "Education Loan"),
        ("credit_card", "Credit Card"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="emi_loans")
    loan_type = models.CharField(max_length=30, choices=LOAN_TYPES, default="other")
    lender_name = models.CharField(max_length=255)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    emi_amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tenure_months = models.PositiveIntegerField()
    emi_start_date = models.DateField()
    emi_end_date = models.DateField()
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.loan_type} - {self.lender_name}"


class Saving(models.Model):
    SAVING_TYPES = [
        ("emergency_fund", "Emergency Fund"),
        ("goal_based", "Goal Based"),
        ("retirement", "Retirement"),
        ("education", "Education"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="savings")
    saving_type = models.CharField(max_length=30, choices=SAVING_TYPES, default="other")
    name = models.CharField(max_length=255)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monthly_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    yearly_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.saving_type}"


class Investment(models.Model):
    INVESTMENT_TYPES = [
        ("sip", "SIP"),
        ("lumpsum", "Lump Sum"),
        ("stocks", "Stocks"),
        ("fd", "Fixed Deposit"),
        ("rd", "Recurring Deposit"),
        ("ppf", "PPF"),
        ("nps", "NPS"),
        ("gold", "Gold"),
        ("real_estate", "Real Estate"),
        ("crypto", "Crypto"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="investments")
    investment_type = models.CharField(max_length=30, choices=INVESTMENT_TYPES, default="other")
    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=255, blank=True, null=True)
    monthly_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    yearly_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invested_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_return_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    start_date = models.DateField(null=True, blank=True)
    maturity_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.investment_type}"


class EmergencyExpense(models.Model):
    EMERGENCY_TYPES = [
        ("medical", "Medical"),
        ("vehicle_repair", "Vehicle Repair"),
        ("home_repair", "Home Repair"),
        ("job_loss", "Job Loss"),
        ("natural_disaster", "Natural Disaster"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="emergency_expenses")
    emergency_type = models.CharField(max_length=30, choices=EMERGENCY_TYPES, default="other")
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    covered_by_insurance = models.BooleanField(default=False)
    insurance_claim_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-expense_date"]

    def __str__(self):
        return f"{self.title} - {self.amount}"