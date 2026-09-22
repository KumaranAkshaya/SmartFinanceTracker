from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import *
from .serializers import *
from user.models import UserActivityLog
from rest_framework.response import Response
from budget.utils import update_budget_spent
from notifications.utils import notify_goal_achieved


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


class ExpenseCategoryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        categories = ExpenseCategory.objects.filter(user=request.user)
        serializer = ExpenseCategorySerializer(categories, many=True)
        return custom_response(True, "Expense categories fetched", serializer.data)

    def post(self, request):
        serializer = ExpenseCategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            create_log(request.user, "create", "expense_category", "Expense category created", new_value=serializer.data)
            return custom_response(True, "Expense category created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        category_id = request.query_params.get("category_id")
        category = ExpenseCategory.objects.filter(id=category_id, user=request.user).first()
        if not category:
            return custom_response(False, "Category not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = ExpenseCategorySerializer(category).data
        serializer = ExpenseCategorySerializer(category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_log(request.user, "update", "expense_category", "Expense category updated", old_value=old_data, new_value=serializer.data)
            return custom_response(True, "Expense category updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        category_id = request.query_params.get("category_id")
        category = ExpenseCategory.objects.filter(id=category_id, user=request.user).first()
        if not category:
            return custom_response(False, "Category not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = ExpenseCategorySerializer(category).data
        category.delete()
        create_log(request.user, "delete", "expense_category", "Expense category deleted", old_value=old_data)
        return custom_response(True, "Expense category deleted")


class ExpenseView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        expenses = Expense.objects.filter(user=request.user).order_by("-expense_date")
        serializer = ExpenseSerializer(expenses, many=True)
        return custom_response(True, "Expenses fetched", serializer.data)

    def post(self, request):
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            expense = serializer.instance
            update_budget_spent(
                user=request.user,
                category=expense.category,
                month=expense.expense_date.month,
                year=expense.expense_date.year,
                amount=expense.amount,
                operation="add"
            )
            create_log(request.user, "create", "expense", "Expense added", new_value=serializer.data)
            return custom_response(True, "Expense created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        expense_id = request.query_params.get("expense_id")
        expense = Expense.objects.filter(id=expense_id, user=request.user).first()
        if not expense:
            return custom_response(False, "Expense not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = ExpenseSerializer(expense).data
        serializer = ExpenseSerializer(expense, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_log(request.user, "update", "expense", "Expense updated", old_value=old_data, new_value=serializer.data)
            return custom_response(True, "Expense updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        expense_id = request.query_params.get("expense_id")
        expense = Expense.objects.filter(id=expense_id, user=request.user).first()
        if not expense:
            return custom_response(False, "Expense not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = ExpenseSerializer(expense).data
        update_budget_spent(
            user=request.user,
            category=expense.category,
            month=expense.expense_date.month,
            year=expense.expense_date.year,
            amount=expense.amount,
            operation="subtract"
        )
        expense.delete()
        create_log(request.user, "delete", "expense", "Expense deleted", old_value=old_data)
        return custom_response(True, "Expense deleted")


class EMILoanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        loan_id = request.query_params.get("loan_id")
        if loan_id:
            loan = EMILoan.objects.filter(id=loan_id, user=request.user).first()
            if not loan:
                return custom_response(False, "EMI/Loan not found", status_code=status.HTTP_404_NOT_FOUND)
            return custom_response(True, "EMI/Loan fetched", EMILoanSerializer(loan).data)
        loans = EMILoan.objects.filter(user=request.user).order_by("-created_at")
        return custom_response(True, "EMI/Loan list fetched", EMILoanSerializer(loans, many=True).data)

    def post(self, request):
        serializer = EMILoanSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            create_log(request.user, "create", "emi_loan", "EMI/Loan created", new_value=serializer.data)
            return custom_response(True, "EMI/Loan created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        loan_id = request.query_params.get("loan_id")
        loan = EMILoan.objects.filter(id=loan_id, user=request.user).first()
        if not loan:
            return custom_response(False, "EMI/Loan not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = EMILoanSerializer(loan).data
        serializer = EMILoanSerializer(loan, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_log(request.user, "update", "emi_loan", "EMI/Loan updated", old_value=old_data, new_value=serializer.data)
            return custom_response(True, "EMI/Loan updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        loan_id = request.query_params.get("loan_id")
        loan = EMILoan.objects.filter(id=loan_id, user=request.user).first()
        if not loan:
            return custom_response(False, "EMI/Loan not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = EMILoanSerializer(loan).data
        loan.delete()
        create_log(request.user, "delete", "emi_loan", "EMI/Loan deleted", old_value=old_data)
        return custom_response(True, "EMI/Loan deleted")


class SavingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        saving_id = request.query_params.get("saving_id")
        if saving_id:
            saving = Saving.objects.filter(id=saving_id, user=request.user).first()
            if not saving:
                return custom_response(False, "Saving not found", status_code=status.HTTP_404_NOT_FOUND)
            return custom_response(True, "Saving fetched", SavingSerializer(saving).data)
        savings = Saving.objects.filter(user=request.user).order_by("-created_at")
        return custom_response(True, "Savings fetched", SavingSerializer(savings, many=True).data)

    def post(self, request):
        serializer = SavingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            create_log(request.user, "create", "saving", "Saving created", new_value=serializer.data)
            return custom_response(True, "Saving created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        saving_id = request.query_params.get("saving_id")
        saving = Saving.objects.filter(id=saving_id, user=request.user).first()
        if not saving:
            return custom_response(False, "Saving not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = SavingSerializer(saving).data
        serializer = SavingSerializer(saving, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            saving = serializer.instance
            if saving.target_amount > 0 and saving.current_amount >= saving.target_amount:
                notify_goal_achieved(saving)
            create_log(request.user, "update", "saving", "Saving updated", old_value=old_data, new_value=serializer.data)
            return custom_response(True, "Saving updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        saving_id = request.query_params.get("saving_id")
        saving = Saving.objects.filter(id=saving_id, user=request.user).first()
        if not saving:
            return custom_response(False, "Saving not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = SavingSerializer(saving).data
        saving.delete()
        create_log(request.user, "delete", "saving", "Saving deleted", old_value=old_data)
        return custom_response(True, "Saving deleted")


class InvestmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        investment_id = request.query_params.get("investment_id")
        if investment_id:
            investment = Investment.objects.filter(id=investment_id, user=request.user).first()
            if not investment:
                return custom_response(False, "Investment not found", status_code=status.HTTP_404_NOT_FOUND)
            return custom_response(True, "Investment fetched", InvestmentSerializer(investment).data)
        investments = Investment.objects.filter(user=request.user).order_by("-created_at")
        return custom_response(True, "Investments fetched", InvestmentSerializer(investments, many=True).data)

    def post(self, request):
        serializer = InvestmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            create_log(request.user, "create", "investment", "Investment created", new_value=serializer.data)
            return custom_response(True, "Investment created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        investment_id = request.query_params.get("investment_id")
        investment = Investment.objects.filter(id=investment_id, user=request.user).first()
        if not investment:
            return custom_response(False, "Investment not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = InvestmentSerializer(investment).data
        serializer = InvestmentSerializer(investment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_log(request.user, "update", "investment", "Investment updated", old_value=old_data, new_value=serializer.data)
            return custom_response(True, "Investment updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        investment_id = request.query_params.get("investment_id")
        investment = Investment.objects.filter(id=investment_id, user=request.user).first()
        if not investment:
            return custom_response(False, "Investment not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = InvestmentSerializer(investment).data
        investment.delete()
        create_log(request.user, "delete", "investment", "Investment deleted", old_value=old_data)
        return custom_response(True, "Investment deleted")


class EmergencyExpenseView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        emergency_id = request.query_params.get("emergency_id")
        if emergency_id:
            emergency = EmergencyExpense.objects.filter(id=emergency_id, user=request.user).first()
            if not emergency:
                return custom_response(False, "Emergency expense not found", status_code=status.HTTP_404_NOT_FOUND)
            return custom_response(True, "Emergency expense fetched", EmergencyExpenseSerializer(emergency).data)
        emergencies = EmergencyExpense.objects.filter(user=request.user).order_by("-expense_date")
        return custom_response(True, "Emergency expenses fetched", EmergencyExpenseSerializer(emergencies, many=True).data)

    def post(self, request):
        serializer = EmergencyExpenseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            print(serializer.data)
            create_log(request.user, "create", "emergency_expense", "Emergency expense added", new_value=serializer.data)
            return custom_response(True, "Emergency expense created", serializer.data, status.HTTP_201_CREATED)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        emergency_id = request.query_params.get("emergency_id")
        emergency = EmergencyExpense.objects.filter(id=emergency_id, user=request.user).first()
        if not emergency:
            return custom_response(False, "Emergency expense not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = EmergencyExpenseSerializer(emergency).data
        serializer = EmergencyExpenseSerializer(emergency, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            create_log(request.user, "update", "emergency_expense", "Emergency expense updated", old_value=old_data, new_value=serializer.data)
            return custom_response(True, "Emergency expense updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        emergency_id = request.query_params.get("emergency_id")
        emergency = EmergencyExpense.objects.filter(id=emergency_id, user=request.user).first()
        if not emergency:
            return custom_response(False, "Emergency expense not found", status_code=status.HTTP_404_NOT_FOUND)
        old_data = EmergencyExpenseSerializer(emergency).data
        emergency.delete()
        create_log(request.user, "delete", "emergency_expense", "Emergency expense deleted", old_value=old_data)
        return custom_response(True, "Emergency expense deleted")