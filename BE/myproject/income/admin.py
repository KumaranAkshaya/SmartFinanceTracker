from django.contrib import admin
from .models import *


@admin.register(IncomeCategory)
class IncomeCategoryAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "user", "created_at"]
    search_fields = ["name", "user__email"]


@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "company_name", "ctc", "gross_salary", "in_hand_salary", "joining_date", "is_active", "created_at"]
    list_filter = ["is_active", "joining_date", "variable_pay_included_in_ctc"]
    search_fields = ["company_name", "user__email"]


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "category", "salary_structure", "amount", "income_date", "is_recurring", "created_at"]
    list_filter = ["category", "income_date", "is_recurring", "salary_structure"]
    search_fields = ["user__email", "description"]