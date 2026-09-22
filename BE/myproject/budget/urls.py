from django.urls import path
from .views import *

urlpatterns = [
    path("",         BudgetView.as_view()),
    path("summary/", BudgetSummaryView.as_view()),
    path("alerts/",  BudgetAlertView.as_view()),
]