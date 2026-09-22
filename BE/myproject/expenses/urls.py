from django.urls import path
from .views import *

urlpatterns = [
    path("categories/",  ExpenseCategoryView.as_view()),
    path("",    ExpenseView.as_view()),
    path("emi-loans/",   EMILoanView.as_view()),
    path("savings/",     SavingView.as_view()),
    path("investments/", InvestmentView.as_view()),
    path("emergency/",   EmergencyExpenseView.as_view()),
]