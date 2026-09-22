from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = "__all__"
        read_only_fields = [
            "user", "is_sent", "created_at", "read_at"
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationPreference
        fields = "__all__"
        read_only_fields = ["user", "updated_at"]