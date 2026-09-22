from django.db import models
from user.models import CustomUser


class IncomeCategory(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="income_categories")
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "name")
        ordering = ["name"]

    def __str__(self):
        return self.name


class SalaryStructure(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="salary_structures")
    company_name = models.CharField(max_length=255)
    ctc = models.DecimalField(max_digits=12, decimal_places=2)
    basic_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pf_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pf_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    esi_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    esi_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    professional_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    variable_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    variable_pay_included_in_ctc = models.BooleanField(default=True)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    in_hand_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    joining_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.company_name


class Income(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="incomes")
    category = models.ForeignKey(IncomeCategory, on_delete=models.CASCADE, related_name="incomes")
    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    income_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-income_date"]

    def __str__(self):
        return f"{self.category.name} - {self.amount}"