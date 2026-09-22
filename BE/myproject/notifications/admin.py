from django.contrib import admin
from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "notification_type", "priority", "title", "is_read", "is_sent", "created_at"]
    list_filter   = ["notification_type", "priority", "is_read", "is_sent"]
    search_fields = ["user__email", "title", "message"]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display  = [
        "id", "user",
        "budget_alert_inapp",  "budget_alert_email",
        "emi_reminder_inapp",  "emi_reminder_email",
        "monthly_report_inapp","monthly_report_email",
        "emi_reminder_days_before",
    ]
    search_fields = ["user__email"]