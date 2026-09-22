from django.db import models
from user.models import CustomUser


class Notification(models.Model):
    TYPE_CHOICES = [
        ("budget_alert",      "Budget Alert"),        # 80% / 100% budget crossed
        ("emi_reminder",      "EMI Reminder"),        # upcoming EMI due
        ("savings_reminder",  "Savings Reminder"),    # monthly contribution reminder
        ("monthly_report",    "Monthly Report"),      # end-of-month summary
        ("investment_update", "Investment Update"),   # gain/loss update
        ("goal_achieved",     "Goal Achieved"),       # saving goal reached 100%
        ("general",           "General"),             # system/admin messages
    ]

    PRIORITY_CHOICES = [
        ("low",    "Low"),
        ("medium", "Medium"),
        ("high",   "High"),
    ]

    user          = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="notifications")
    title         = models.CharField(max_length=255)
    message       = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default="general")
    priority      = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    is_read       = models.BooleanField(default=False)
    is_sent       = models.BooleanField(default=False)   # True once email is dispatched

    # Optional deep-link metadata (so frontend can navigate to the right page)
    redirect_url  = models.CharField(max_length=255, blank=True, null=True)
    meta          = models.JSONField(null=True, blank=True)   # extra context payload

    created_at    = models.DateTimeField(auto_now_add=True)
    read_at       = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.user.username}"


class NotificationPreference(models.Model):
    """
    Per-user toggle for each notification type + channel.
    Auto-created with defaults on first login via signal.
    """
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="notification_preference")

    # In-app toggles
    budget_alert_inapp      = models.BooleanField(default=True)
    emi_reminder_inapp      = models.BooleanField(default=True)
    savings_reminder_inapp  = models.BooleanField(default=True)
    monthly_report_inapp    = models.BooleanField(default=True)
    investment_update_inapp = models.BooleanField(default=True)
    goal_achieved_inapp     = models.BooleanField(default=True)

    # Email toggles
    budget_alert_email      = models.BooleanField(default=True)
    emi_reminder_email      = models.BooleanField(default=True)
    savings_reminder_email  = models.BooleanField(default=False)
    monthly_report_email    = models.BooleanField(default=True)
    investment_update_email = models.BooleanField(default=False)
    goal_achieved_email     = models.BooleanField(default=True)

    # How many days before EMI due date to remind
    emi_reminder_days_before = models.PositiveIntegerField(default=3)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences → {self.user.username}"