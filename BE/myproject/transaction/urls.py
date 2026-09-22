from django.urls import path
from .views import TransactionView, CSVUploadView, CSVExportView

urlpatterns = [
    path("", TransactionView.as_view()),
    path("upload/", CSVUploadView.as_view()),
    path("export/", CSVExportView.as_view()),
]