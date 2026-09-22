from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import *
from .serializers import *
from user.models import UserActivityLog
from rest_framework.response import Response


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


class IncomeCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = IncomeCategory.objects.filter(user=request.user)
        serializer = IncomeCategorySerializer(categories, many=True)
        return custom_response(True, "Income categories fetched", serializer.data)

    def post(self, request):
        serializer = IncomeCategorySerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)

            create_log(
                request.user,
                "create",
                "income_category",
                "Income category created",
                new_value=serializer.data
            )

            return custom_response(True, "Income category created", serializer.data, status.HTTP_201_CREATED)

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        category_id = request.query_params.get("category_id")
        category = IncomeCategory.objects.filter(id=category_id, user=request.user).first()

        if not category:
            return custom_response(False, "Income category not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = IncomeCategorySerializer(category).data
        serializer = IncomeCategorySerializer(category, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()

            create_log(
                request.user,
                "update",
                "income_category",
                "Income category updated",
                old_value=old_data,
                new_value=serializer.data
            )

            return custom_response(True, "Income category updated", serializer.data)

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        category_id = request.query_params.get("category_id")
        category = IncomeCategory.objects.filter(id=category_id, user=request.user).first()

        if not category:
            return custom_response(False, "Income category not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = IncomeCategorySerializer(category).data
        category.delete()

        create_log(
            request.user,
            "delete",
            "income_category",
            "Income category deleted",
            old_value=old_data
        )

        return custom_response(True, "Income category deleted")


class SalaryStructureView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        salary_id = request.query_params.get("salary_id")

        if salary_id:
            salary = SalaryStructure.objects.filter(id=salary_id, user=request.user).first()
            if not salary:
                return custom_response(False, "Salary structure not found", status_code=status.HTTP_404_NOT_FOUND)
            serializer = SalaryStructureSerializer(salary)
            return custom_response(True, "Salary structure fetched", serializer.data)

        salaries = SalaryStructure.objects.filter(user=request.user).order_by("-created_at")
        serializer = SalaryStructureSerializer(salaries, many=True)
        return custom_response(True, "Salary structures fetched", serializer.data)

    def post(self, request):
        serializer = SalaryStructureSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)

            create_log(
                request.user,
                "create",
                "salary_structure",
                "Salary structure created",
                new_value=serializer.data
            )

            return custom_response(True, "Salary structure created", serializer.data, status.HTTP_201_CREATED)

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        salary_id = request.query_params.get("salary_id")
        salary = SalaryStructure.objects.filter(id=salary_id, user=request.user).first()

        if not salary:
            return custom_response(False, "Salary structure not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = SalaryStructureSerializer(salary).data
        serializer = SalaryStructureSerializer(salary, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()

            create_log(
                request.user,
                "update",
                "salary_structure",
                "Salary structure updated",
                old_value=old_data,
                new_value=serializer.data
            )

            return custom_response(True, "Salary structure updated", serializer.data)

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        salary_id = request.query_params.get("salary_id")
        salary = SalaryStructure.objects.filter(id=salary_id, user=request.user).first()

        if not salary:
            return custom_response(False, "Salary structure not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = SalaryStructureSerializer(salary).data
        salary.delete()

        create_log(
            request.user,
            "delete",
            "salary_structure",
            "Salary structure deleted",
            old_value=old_data
        )

        return custom_response(True, "Salary structure deleted")


class IncomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        incomes = Income.objects.filter(user=request.user).order_by("-income_date")
        serializer = IncomeSerializer(incomes, many=True)
        return custom_response(True, "Income list fetched", serializer.data)

    def post(self, request):
        serializer = IncomeSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)

            create_log(
                request.user,
                "create",
                "income",
                "Income added",
                new_value=serializer.data
            )

            return custom_response(True, "Income created", serializer.data, status.HTTP_201_CREATED)

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        income_id = request.query_params.get("income_id")
        income = Income.objects.filter(id=income_id, user=request.user).first()

        if not income:
            return custom_response(False, "Income not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = IncomeSerializer(income).data
        serializer = IncomeSerializer(income, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()

            create_log(
                request.user,
                "update",
                "income",
                "Income updated",
                old_value=old_data,
                new_value=serializer.data
            )

            return custom_response(True, "Income updated", serializer.data)

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        income_id = request.query_params.get("income_id")
        income = Income.objects.filter(id=income_id, user=request.user).first()

        if not income:
            return custom_response(False, "Income not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = IncomeSerializer(income).data
        income.delete()

        create_log(
            request.user,
            "delete",
            "income",
            "Income deleted",
            old_value=old_data
        )

        return custom_response(True, "Income deleted")