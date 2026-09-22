from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import *
from .models import *

def custom_response(success, message, data=None, status_code=200):
    return Response({
        "success": success,
        "message": message,
        "data": data
    }, status=status_code)

def create_user_log(user, action_type, module_name, description="", old_value=None, new_value=None):
    UserActivityLog.objects.create(
        user=user,
        action_type=action_type,
        module_name=module_name,
        description=description,
        old_value=old_value,
        new_value=new_value
    )

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)

            create_user_log(
                user=user,
                action_type="create",
                module_name="users",
                description="User registered successfully"
            )

            return custom_response(
                True,
                "User registered successfully",
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status.HTTP_201_CREATED
            )

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user:
            refresh = RefreshToken.for_user(user)

            create_user_log(
                user=user,
                action_type="login",
                module_name="users",
                description="User logged in successfully"
            )

            return custom_response(
                True,
                "Login successful",
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                }
            )

        return custom_response(False, "Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.filter(user=request.user).first()

        if not profile:
            return custom_response(False, "Profile not found", status_code=status.HTTP_404_NOT_FOUND)

        serializer = UserProfileSerializer(profile)
        return custom_response(True, "Profile fetched successfully", serializer.data)

    def put(self, request):
        profile = UserProfile.objects.filter(user=request.user).first()

        if not profile:
            return custom_response(False, "Profile not found", status_code=status.HTTP_404_NOT_FOUND)

        old_data = UserProfileSerializer(profile).data

        serializer = UserProfileSerializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()

            create_user_log(
                user=request.user,
                action_type="update",
                module_name="user_profile",
                description="User profile updated",
                old_value=old_data,
                new_value=serializer.data
            )

            return custom_response(True, "Profile updated successfully", serializer.data)

        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)