from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import *


# 🔹 Inlines
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0


class UserSettingsInline(admin.StackedInline):
    model = UserSettings
    can_delete = False
    extra = 0


# 🔹 Custom User Admin
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('id', 'username', 'email', 'phone', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    search_fields = ('username', 'email', 'phone')
    ordering = ('id',)

    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('phone', 'address')}),
    )
    inlines = [UserProfileInline, UserSettingsInline]


# 🔹 Profile & Settings Admin
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'full_name', 'country', 'occupation')
    list_filter = ('country', 'occupation')
    search_fields = ('user__username', 'full_name', 'occupation')
    ordering = ('id',)

@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'email_notifications', 'budget_alerts', 'dark_mode')
    list_filter = ('email_notifications', 'budget_alerts', 'dark_mode')
    search_fields = ('user__username',)
    ordering = ('id',)


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action_type', 'module_name', 'created_at')
    list_filter = ('action_type', 'module_name')
    search_fields = ('user__username', 'description')
    ordering = ('id',)