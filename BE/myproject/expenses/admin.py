from django.contrib import admin
from .models import *


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "name", "category_type", "created_at"]
    list_filter = ["category_type"]
    search_fields = ["name", "user__email"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "category", "amount", "expense_date", "frequency", "is_recurring"]
    list_filter = ["frequency", "is_recurring", "expense_date"]
    search_fields = ["user__email", "description"]


@admin.register(EMILoan)
class EMILoanAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "loan_type", "lender_name", "principal_amount", "emi_amount", "tenure_months", "emi_start_date", "emi_end_date", "is_active"]
    list_filter = ["loan_type", "is_active"]
    search_fields = ["lender_name", "user__email"]


@admin.register(Saving)
class SavingAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "name", "saving_type", "target_amount", "current_amount", "monthly_contribution", "yearly_contribution", "is_active"]
    list_filter = ["saving_type", "is_active"]
    search_fields = ["name", "user__email"]


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "name", "investment_type", "platform", "monthly_amount", "yearly_amount", "invested_amount", "current_value", "is_active"]
    list_filter = ["investment_type", "is_active"]
    search_fields = ["name", "platform", "user__email"]


@admin.register(EmergencyExpense)
class EmergencyExpenseAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "title", "emergency_type", "amount", "expense_date", "covered_by_insurance", "insurance_claim_amount"]
    list_filter = ["emergency_type", "covered_by_insurance"]
    search_fields = ["title", "user__email"]