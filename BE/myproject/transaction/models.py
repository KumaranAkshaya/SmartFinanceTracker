from django.db import models
from user.models import CustomUser
from income.models import Income, IncomeCategory
from expenses.models import Expense, ExpenseCategory


class Transaction(models.Model):
    TYPE_CHOICES = [
        ("income", "Income"),
        ("expense", "Expense"),
    ]

    SOURCE_CHOICES = [
        ("manual", "Manual"),
        ("csv_upload", "CSV Upload"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")

    # Optional FK back to actual income / expense record
    income = models.OneToOneField(Income, on_delete=models.SET_NULL, null=True, blank=True, related_name="transaction")
    expense = models.OneToOneField(Expense, on_delete=models.SET_NULL, null=True, blank=True, related_name="transaction")

    # Category stored as text for CSV rows that couldn't be matched
    category_name = models.CharField(max_length=100, blank=True, null=True)

    # Raw bank statement row (for CSV uploads)
    raw_description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.transaction_type} | {self.amount} | {self.date}"


class CSVUpload(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="csv_uploads")
    file = models.FileField(upload_to="csv_uploads/%Y/%m/")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_rows = models.PositiveIntegerField(default=0)
    imported_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    error_log = models.JSONField(null=True, blank=True)   # list of {row, reason}
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.user.username} - {self.uploaded_at.date()} ({self.status})"