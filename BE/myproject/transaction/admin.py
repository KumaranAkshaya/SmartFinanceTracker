from django.contrib import admin
from .models import Transaction, CSVUpload


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "transaction_type", "amount", "date", "category_name", "source", "created_at"]
    list_filter   = ["transaction_type", "source", "date"]
    search_fields = ["user__email", "description", "raw_description", "category_name"]


@admin.register(CSVUpload)
class CSVUploadAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "status", "total_rows", "imported_rows", "failed_rows", "uploaded_at"]
    list_filter   = ["status"]
    search_fields = ["user__email"]