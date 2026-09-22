from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from .models import Budget, BudgetAlert
from .serializers import BudgetSerializer, BudgetAlertSerializer
from user.models import UserActivityLog
import datetime


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


class BudgetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Optional filters: ?month=6&year=2025 or ?budget_id=1
        budget_id = request.query_params.get("budget_id")

        if budget_id:
            budget = Budget.objects.filter(id=budget_id, user=request.user).first()
            if not budget:
                return custom_response(False, "Budget not found", status_code=status.HTTP_404_NOT_FOUND)
            return custom_response(True, "Budget fetched", BudgetSerializer(budget).data)

        month = request.query_params.get("month")
        year = request.query_params.get("year")

        budgets = Budget.objects.filter(user=request.user)

        if month:
            budgets = budgets.filter(month=month)
        if year:
            budgets = budgets.filter(year=year)

        # Default to current month if no filters provided
        if not month and not year:
            now = datetime.date.today()
            budgets = budgets.filter(month=now.month, year=now.year)

        serializer = BudgetSerializer(budgets, many=True)
        return custom_response(True, "Budgets fetched", serializer.data)

    def post(self, request):
        serializer = BudgetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            create_log(
                request.user, "create", "budget",
                "Budget created", new_value=serializer.data
            )
            return custom_response(True, "Budget created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        budget_id = request.query_params.get("budget_id")
        budget = Budget.objects.filter(id=budget_id, user=request.user).first()
        if not budget:
            return custom_response(False, "Budget not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = BudgetSerializer(budget).data
        serializer = BudgetSerializer(budget, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_log(
                request.user, "update", "budget",
                "Budget updated", old_value=old_data, new_value=serializer.data
            )
            return custom_response(True, "Budget updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        budget_id = request.query_params.get("budget_id")
        budget = Budget.objects.filter(id=budget_id, user=request.user).first()
        if not budget:
            return custom_response(False, "Budget not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = BudgetSerializer(budget).data
        budget.delete()
        create_log(
            request.user, "delete", "budget",
            "Budget deleted", old_value=old_data
        )
        return custom_response(True, "Budget deleted")


class BudgetSummaryView(APIView):
    """
    GET /budget/summary/?month=6&year=2025
    Returns total limit, total spent, remaining, and per-category breakdown.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = datetime.date.today()
        month = int(request.query_params.get("month", now.month))
        year = int(request.query_params.get("year", now.year))

        budgets = Budget.objects.filter(user=request.user, month=month, year=year)

        total_limit = sum(b.limit_amount for b in budgets)
        total_spent = sum(b.spent_amount for b in budgets)
        total_remaining = total_limit - total_spent

        breakdown = BudgetSerializer(budgets, many=True).data

        return custom_response(True, "Budget summary fetched", {
            "month": month,
            "year": year,
            "total_limit": total_limit,
            "total_spent": total_spent,
            "total_remaining": total_remaining,
            "breakdown": breakdown
        })


class BudgetAlertView(APIView):
    """
    GET  /budget/alerts/              → all unread alerts
    PUT  /budget/alerts/?alert_id=1   → mark as read
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alerts = BudgetAlert.objects.filter(user=request.user, is_read=False)
        serializer = BudgetAlertSerializer(alerts, many=True)
        return custom_response(True, "Budget alerts fetched", serializer.data)

    def put(self, request):
        alert_id = request.query_params.get("alert_id")

        if alert_id:
            alert = BudgetAlert.objects.filter(id=alert_id, user=request.user).first()
            if not alert:
                return custom_response(False, "Alert not found", status_code=status.HTTP_404_NOT_FOUND)
            alert.is_read = True
            alert.save()
            return custom_response(True, "Alert marked as read")

        # Mark all as read
        BudgetAlert.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return custom_response(True, "All alerts marked as read")