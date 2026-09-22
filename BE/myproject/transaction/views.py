from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
import datetime
import csv
import io

from .models import Transaction, CSVUpload
from .serializers import TransactionSerializer, CSVUploadSerializer
from .csv_parser import process_csv
from user.models import UserActivityLog


def custom_response(success, message, data=None, status_code=200):
    return Response({
        "success": success,
        "message": message,
        "data": data
    }, status=status_code)


def create_log(user, action_type, module_name, description="", old_value=None, new_value=None):
    UserActivityLog.objects.create(
        user=user,
        action_type=action_type,
        module_name=module_name,
        description=description,
        old_value=old_value,
        new_value=new_value
    )


# ─────────────────────────────────────────────
# 1. UNIFIED TRANSACTION FEED
# ─────────────────────────────────────────────
class TransactionView(APIView):
    """
    GET  /transactions/             → paginated + filtered feed
    POST /transactions/             → create manual transaction
    PUT  /transactions/?txn_id=     → update
    DELETE /transactions/?txn_id=   → delete
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        txns = Transaction.objects.filter(user=request.user)

        # ── Filters ─────────────────────────────────────
        txn_type    = request.query_params.get("type")          # income / expense
        category    = request.query_params.get("category")      # category name
        source      = request.query_params.get("source")        # manual / csv_upload
        start_date  = request.query_params.get("start_date")    # YYYY-MM-DD
        end_date    = request.query_params.get("end_date")
        month       = request.query_params.get("month")
        year        = request.query_params.get("year")
        min_amount  = request.query_params.get("min_amount")
        max_amount  = request.query_params.get("max_amount")
        search      = request.query_params.get("search")        # keyword in description

        if txn_type:
            txns = txns.filter(transaction_type=txn_type)
        if category:
            txns = txns.filter(category_name__icontains=category)
        if source:
            txns = txns.filter(source=source)
        if start_date:
            txns = txns.filter(date__gte=start_date)
        if end_date:
            txns = txns.filter(date__lte=end_date)
        if month:
            txns = txns.filter(date__month=month)
        if year:
            txns = txns.filter(date__year=year)
        if min_amount:
            txns = txns.filter(amount__gte=min_amount)
        if max_amount:
            txns = txns.filter(amount__lte=max_amount)
        if search:
            txns = txns.filter(
                Q(description__icontains=search) |
                Q(raw_description__icontains=search) |
                Q(category_name__icontains=search)
            )

        # ── Pagination ───────────────────────────────────
        page      = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        start     = (page - 1) * page_size
        end       = start + page_size

        total      = txns.count()
        paginated  = txns[start:end]
        serializer = TransactionSerializer(paginated, many=True)

        return custom_response(True, "Transactions fetched", {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": -(-total // page_size),   # ceiling division
            "results": serializer.data,
        })

    def post(self, request):
        serializer = TransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, source="manual")
            create_log(
                request.user, "create", "transaction",
                "Transaction created", new_value=serializer.data
            )
            return custom_response(True, "Transaction created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        txn_id = request.query_params.get("txn_id")
        txn = Transaction.objects.filter(id=txn_id, user=request.user).first()
        if not txn:
            return custom_response(False, "Transaction not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data   = TransactionSerializer(txn).data
        serializer = TransactionSerializer(txn, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_log(
                request.user, "update", "transaction",
                "Transaction updated", old_value=old_data, new_value=serializer.data
            )
            return custom_response(True, "Transaction updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        txn_id = request.query_params.get("txn_id")
        txn = Transaction.objects.filter(id=txn_id, user=request.user).first()
        if not txn:
            return custom_response(False, "Transaction not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = TransactionSerializer(txn).data
        txn.delete()
        create_log(
            request.user, "delete", "transaction",
            "Transaction deleted", old_value=old_data
        )
        return custom_response(True, "Transaction deleted")


# ─────────────────────────────────────────────
# 2. CSV UPLOAD
# ─────────────────────────────────────────────
class CSVUploadView(APIView):
    """
    POST /transactions/upload/   → upload bank statement CSV
    GET  /transactions/upload/   → list all past uploads
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uploads    = CSVUpload.objects.filter(user=request.user)
        serializer = CSVUploadSerializer(uploads, many=True)
        return custom_response(True, "CSV uploads fetched", serializer.data)

    def post(self, request):
        file = request.FILES.get("file")

        if not file:
            return custom_response(False, "No file provided", status_code=status.HTTP_400_BAD_REQUEST)

        if not file.name.endswith(".csv"):
            return custom_response(False, "Only CSV files are supported", status_code=status.HTTP_400_BAD_REQUEST)

        # Save upload record
        csv_upload = CSVUpload.objects.create(user=request.user, file=file)

        # Process synchronously (swap for Celery task in production)
        process_csv(csv_upload, request.user)

        serializer = CSVUploadSerializer(csv_upload)

        create_log(
            request.user, "create", "csv_upload",
            f"CSV uploaded: {file.name}", new_value={"filename": file.name}
        )

        return custom_response(
            True,
            f"CSV processed. {csv_upload.imported_rows}/{csv_upload.total_rows} rows imported.",
            serializer.data,
            status.HTTP_201_CREATED
        )


# ─────────────────────────────────────────────
# 3. CSV EXPORT
# ─────────────────────────────────────────────
class CSVExportView(APIView):
    """
    GET /transactions/export/   → download all transactions as CSV
    Supports same filters as TransactionView.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.http import HttpResponse

        txns = Transaction.objects.filter(user=request.user)

        # Apply same filters
        txn_type   = request.query_params.get("type")
        start_date = request.query_params.get("start_date")
        end_date   = request.query_params.get("end_date")
        month      = request.query_params.get("month")
        year       = request.query_params.get("year")

        if txn_type:
            txns = txns.filter(transaction_type=txn_type)
        if start_date:
            txns = txns.filter(date__gte=start_date)
        if end_date:
            txns = txns.filter(date__lte=end_date)
        if month:
            txns = txns.filter(date__month=month)
        if year:
            txns = txns.filter(date__year=year)

        # Build CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Type", "Category", "Amount", "Description", "Source"])

        for txn in txns:
            writer.writerow([
                txn.date,
                txn.transaction_type,
                txn.category_name or "",
                txn.amount,
                txn.description or "",
                txn.source,
            ])

        output.seek(0)
        filename = f"transactions_{datetime.date.today()}.csv"
        response = HttpResponse(output.read(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response