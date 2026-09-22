from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncMonth
import datetime

from income.models import Income
from expenses.models import Expense, EMILoan, Saving, Investment, EmergencyExpense
from budget.models import Budget, BudgetAlert


def custom_response(success, message, data=None, status_code=200):
    return Response({
        "success": success,
        "message": message,
        "data": data
    }, status=status_code)


# ─────────────────────────────────────────────
# 1. DASHBOARD SUMMARY  →  GET /analytics/dashboard/
# ─────────────────────────────────────────────
class DashboardSummaryView(APIView):
    """
    Current month snapshot shown on the main dashboard cards.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = datetime.date.today()
        month = int(request.query_params.get("month", now.month))
        year  = int(request.query_params.get("year",  now.year))

        # ── Income ──────────────────────────────────────
        total_income = Income.objects.filter(
            user=request.user, income_date__month=month, income_date__year=year
        ).aggregate(total=Sum("amount"))["total"] or 0

        # ── Expenses ────────────────────────────────────
        total_expense = Expense.objects.filter(
            user=request.user, expense_date__month=month, expense_date__year=year
        ).aggregate(total=Sum("amount"))["total"] or 0

        # ── EMI total for the month ──────────────────────
        total_emi = EMILoan.objects.filter(
            user=request.user, is_active=True,
            emi_start_date__lte=datetime.date(year, month, 1),
            emi_end_date__gte=datetime.date(year, month, 1)
        ).aggregate(total=Sum("emi_amount"))["total"] or 0

        # ── Savings contribution ────────────────────────
        total_savings = Saving.objects.filter(
            user=request.user, is_active=True
        ).aggregate(total=Sum("monthly_contribution"))["total"] or 0

        # ── Investment contribution ─────────────────────
        total_investments = Investment.objects.filter(
            user=request.user, is_active=True
        ).aggregate(total=Sum("monthly_amount"))["total"] or 0

        # ── Emergency expenses this month ───────────────
        total_emergency = EmergencyExpense.objects.filter(
            user=request.user, expense_date__month=month, expense_date__year=year
        ).aggregate(total=Sum("amount"))["total"] or 0

        # ── Budget alerts (unread) ───────────────────────
        unread_alerts = BudgetAlert.objects.filter(
            user=request.user, is_read=False
        ).count()

        # ── Derived ─────────────────────────────────────
        total_outflow = total_expense + total_emi + total_savings + total_investments + total_emergency
        net_savings   = total_income - total_outflow
        savings_rate  = round((net_savings / total_income) * 100, 2) if total_income > 0 else 0

        return custom_response(True, "Dashboard summary fetched", {
            "month": month,
            "year": year,
            "total_income": total_income,
            "total_expense": total_expense,
            "total_emi": total_emi,
            "total_savings": total_savings,
            "total_investments": total_investments,
            "total_emergency": total_emergency,
            "total_outflow": total_outflow,
            "net_savings": net_savings,
            "savings_rate_percentage": savings_rate,
            "unread_budget_alerts": unread_alerts,
        })


# ─────────────────────────────────────────────
# 2. MONTHLY CASH FLOW  →  GET /analytics/cashflow/
# ─────────────────────────────────────────────
class CashFlowView(APIView):
    """
    Month-over-month income vs expense trend for the last N months.
    Powers the line/bar chart on the dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        months = int(request.query_params.get("months", 6))   # default last 6 months

        # Build list of (year, month) tuples going backwards
        today = datetime.date.today()
        periods = []
        for i in range(months - 1, -1, -1):
            month = (today.month - i - 1) % 12 + 1
            year  = today.year - ((today.month - i - 1) // 12)
            periods.append((year, month))

        result = []
        for year, month in periods:
            income = Income.objects.filter(
                user=request.user, income_date__month=month, income_date__year=year
            ).aggregate(total=Sum("amount"))["total"] or 0

            expense = Expense.objects.filter(
                user=request.user, expense_date__month=month, expense_date__year=year
            ).aggregate(total=Sum("amount"))["total"] or 0

            result.append({
                "year": year,
                "month": month,
                "month_label": datetime.date(year, month, 1).strftime("%b %Y"),
                "income": income,
                "expense": expense,
                "net": income - expense,
            })

        return custom_response(True, "Cash flow fetched", result)


# ─────────────────────────────────────────────
# 3. EXPENSE CATEGORY BREAKDOWN  →  GET /analytics/expense-breakdown/
# ─────────────────────────────────────────────
class ExpenseCategoryBreakdownView(APIView):
    """
    Per-category total for a given month — powers the pie chart.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now   = datetime.date.today()
        month = int(request.query_params.get("month", now.month))
        year  = int(request.query_params.get("year",  now.year))

        breakdown = (
            Expense.objects
            .filter(user=request.user, expense_date__month=month, expense_date__year=year)
            .values("category__name", "category__category_type")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        total_expense = sum(item["total"] for item in breakdown)

        result = [
            {
                "category": item["category__name"],
                "category_type": item["category__category_type"],
                "total": item["total"],
                "count": item["count"],
                "percentage": round((item["total"] / total_expense) * 100, 2) if total_expense > 0 else 0,
            }
            for item in breakdown
        ]

        return custom_response(True, "Expense breakdown fetched", {
            "month": month,
            "year": year,
            "total_expense": total_expense,
            "breakdown": result,
        })


# ─────────────────────────────────────────────
# 4. INCOME BREAKDOWN  →  GET /analytics/income-breakdown/
# ─────────────────────────────────────────────
class IncomeCategoryBreakdownView(APIView):
    """
    Per-category income total for a given month.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now   = datetime.date.today()
        month = int(request.query_params.get("month", now.month))
        year  = int(request.query_params.get("year",  now.year))

        breakdown = (
            Income.objects
            .filter(user=request.user, income_date__month=month, income_date__year=year)
            .values("category__name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        total_income = sum(item["total"] for item in breakdown)

        result = [
            {
                "category": item["category__name"],
                "total": item["total"],
                "count": item["count"],
                "percentage": round((item["total"] / total_income) * 100, 2) if total_income > 0 else 0,
            }
            for item in breakdown
        ]

        return custom_response(True, "Income breakdown fetched", {
            "month": month,
            "year": year,
            "total_income": total_income,
            "breakdown": result,
        })


# ─────────────────────────────────────────────
# 5. NET WORTH SNAPSHOT  →  GET /analytics/net-worth/
# ─────────────────────────────────────────────
class NetWorthView(APIView):
    """
    Assets (investments + savings) minus Liabilities (outstanding loans).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # ── Assets ──────────────────────────────────────
        total_invested = Investment.objects.filter(
            user=request.user, is_active=True
        ).aggregate(total=Sum("current_value"))["total"] or 0

        total_savings = Saving.objects.filter(
            user=request.user, is_active=True
        ).aggregate(total=Sum("current_amount"))["total"] or 0

        total_assets = total_invested + total_savings

        # ── Liabilities ─────────────────────────────────
        total_outstanding_loans = EMILoan.objects.filter(
            user=request.user, is_active=True
        ).aggregate(total=Sum("outstanding_amount"))["total"] or 0

        # ── Net Worth ────────────────────────────────────
        net_worth = total_assets - total_outstanding_loans

        # ── Investment breakdown ─────────────────────────
        investment_breakdown = (
            Investment.objects
            .filter(user=request.user, is_active=True)
            .values("investment_type")
            .annotate(total=Sum("current_value"))
            .order_by("-total")
        )

        # ── Saving breakdown ─────────────────────────────
        saving_breakdown = (
            Saving.objects
            .filter(user=request.user, is_active=True)
            .values("saving_type")
            .annotate(total=Sum("current_amount"))
            .order_by("-total")
        )

        return custom_response(True, "Net worth fetched", {
            "total_assets": total_assets,
            "total_invested": total_invested,
            "total_savings": total_savings,
            "total_liabilities": total_outstanding_loans,
            "net_worth": net_worth,
            "investment_breakdown": list(investment_breakdown),
            "saving_breakdown": list(saving_breakdown),
        })


# ─────────────────────────────────────────────
# 6. BUDGET VS ACTUAL  →  GET /analytics/budget-vs-actual/
# ─────────────────────────────────────────────
class BudgetVsActualView(APIView):
    """
    Side-by-side budget limit vs actual spend per category for a month.
    Powers the grouped bar chart.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now   = datetime.date.today()
        month = int(request.query_params.get("month", now.month))
        year  = int(request.query_params.get("year",  now.year))

        budgets = Budget.objects.filter(
            user=request.user, month=month, year=year
        ).select_related("category")

        result = [
            {
                "category": b.category.name,
                "category_type": b.category.category_type,
                "limit": b.limit_amount,
                "spent": b.spent_amount,
                "remaining": b.remaining_amount,
                "usage_percentage": b.usage_percentage,
                "is_exceeded": b.is_exceeded,
                "is_alert_triggered": b.is_alert_triggered,
            }
            for b in budgets
        ]

        total_limit   = sum(b.limit_amount  for b in budgets)
        total_spent   = sum(b.spent_amount  for b in budgets)
        exceeded_count = sum(1 for b in budgets if b.is_exceeded)

        return custom_response(True, "Budget vs actual fetched", {
            "month": month,
            "year": year,
            "total_limit": total_limit,
            "total_spent": total_spent,
            "total_remaining": total_limit - total_spent,
            "exceeded_categories": exceeded_count,
            "breakdown": result,
        })


# ─────────────────────────────────────────────
# 7. YEARLY SUMMARY  →  GET /analytics/yearly-summary/
# ─────────────────────────────────────────────
class YearlySummaryView(APIView):
    """
    Full year breakdown — income, expense, net savings per month.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get("year", datetime.date.today().year))

        monthly = []
        annual_income   = 0
        annual_expense  = 0

        for month in range(1, 13):
            income = Income.objects.filter(
                user=request.user, income_date__month=month, income_date__year=year
            ).aggregate(total=Sum("amount"))["total"] or 0

            expense = Expense.objects.filter(
                user=request.user, expense_date__month=month, expense_date__year=year
            ).aggregate(total=Sum("amount"))["total"] or 0

            annual_income  += income
            annual_expense += expense

            monthly.append({
                "month": month,
                "month_label": datetime.date(year, month, 1).strftime("%b"),
                "income": income,
                "expense": expense,
                "net": income - expense,
            })

        return custom_response(True, "Yearly summary fetched", {
            "year": year,
            "annual_income": annual_income,
            "annual_expense": annual_expense,
            "annual_net": annual_income - annual_expense,
            "monthly_breakdown": monthly,
        })


# ─────────────────────────────────────────────
# 8. SAVINGS PROGRESS  →  GET /analytics/savings-progress/
# ─────────────────────────────────────────────
class SavingsProgressView(APIView):
    """
    Progress for each active saving goal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        savings = Saving.objects.filter(user=request.user, is_active=True)

        result = [
            {
                "id": s.id,
                "name": s.name,
                "saving_type": s.saving_type,
                "target_amount": s.target_amount,
                "current_amount": s.current_amount,
                "remaining": s.target_amount - s.current_amount,
                "progress_percentage": round(
                    (s.current_amount / s.target_amount) * 100, 2
                ) if s.target_amount > 0 else 0,
                "monthly_contribution": s.monthly_contribution,
                "target_date": s.target_date,
            }
            for s in savings
        ]

        return custom_response(True, "Savings progress fetched", result)


# ─────────────────────────────────────────────
# 9. INVESTMENT PERFORMANCE  →  GET /analytics/investment-performance/
# ─────────────────────────────────────────────
class InvestmentPerformanceView(APIView):
    """
    Gain/loss and return % for each active investment.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        investments = Investment.objects.filter(user=request.user, is_active=True)

        result = []
        total_invested    = 0
        total_current     = 0

        for inv in investments:
            gain_loss       = inv.current_value - inv.invested_amount
            return_pct      = round((gain_loss / inv.invested_amount) * 100, 2) if inv.invested_amount > 0 else 0
            total_invested += inv.invested_amount
            total_current  += inv.current_value

            result.append({
                "id": inv.id,
                "name": inv.name,
                "investment_type": inv.investment_type,
                "platform": inv.platform,
                "invested_amount": inv.invested_amount,
                "current_value": inv.current_value,
                "gain_loss": gain_loss,
                "return_percentage": return_pct,
                "monthly_amount": inv.monthly_amount,
            })

        overall_gain   = total_current - total_invested
        overall_return = round((overall_gain / total_invested) * 100, 2) if total_invested > 0 else 0

        return custom_response(True, "Investment performance fetched", {
            "total_invested": total_invested,
            "total_current_value": total_current,
            "overall_gain_loss": overall_gain,
            "overall_return_percentage": overall_return,
            "investments": result,
        })