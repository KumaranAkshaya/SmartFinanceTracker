from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    phone = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.username

class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)

    # Personal details
    full_name = models.CharField(max_length=150)
    date_of_birth = models.DateField(null=True, blank=True)
    country = models.CharField(max_length=100, default="India")
    currency = models.CharField(max_length=10, default="INR")
    occupation = models.CharField(max_length=150, blank=True)

    # Employment details
    ctc = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    pf_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    variable_pay = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    variable_pay_included_in_ctc = models.BooleanField(default=True)

    tax_regime = models.CharField(max_length=50, blank=True)

    # Business details
    has_business = models.BooleanField(default=False)
    business_description = models.TextField(blank=True)
    business_monthly_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class UserSettings(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    email_notifications = models.BooleanField(default=True)
    budget_alerts = models.BooleanField(default=True)
    dark_mode = models.BooleanField(default=False)

class UserActivityLog(models.Model):
    ACTION_CHOICES = (
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("login", "Login"),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module_name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)