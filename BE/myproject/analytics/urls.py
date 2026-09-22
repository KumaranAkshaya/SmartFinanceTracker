from django.urls import path
from .views import *

urlpatterns = [
    path("dashboard/",              DashboardSummaryView.as_view()),
    path("cashflow/",               CashFlowView.as_view()),
    path("expense-breakdown/",      ExpenseCategoryBreakdownView.as_view()),
    path("income-breakdown/",       IncomeCategoryBreakdownView.as_view()),
    path("net-worth/",              NetWorthView.as_view()),
    path("budget-vs-actual/",       BudgetVsActualView.as_view()),
    path("yearly-summary/",         YearlySummaryView.as_view()),
    path("savings-progress/",       SavingsProgressView.as_view()),
    path("investment-performance/", InvestmentPerformanceView.as_view()),
]