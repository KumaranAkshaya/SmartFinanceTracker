from rest_framework import serializers
from .models import Transaction, CSVUpload


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = "__all__"
        read_only_fields = [
            "user", "source", "income", "expense",
            "created_at", "updated_at"
        ]


class CSVUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = CSVUpload
        fields = "__all__"
        read_only_fields = [
            "user", "status", "total_rows", "imported_rows",
            "failed_rows", "error_log", "uploaded_at"
        ]