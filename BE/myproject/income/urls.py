from django.urls import path
from .views import *

urlpatterns = [
    path("categories/", IncomeCategoryView.as_view(), name="income-categories"),
    path("", IncomeView.as_view(), name="income-list-create"),  
    path("salary-structure/", SalaryStructureView.as_view()),
]