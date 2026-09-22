from django.urls import path
from .views import (
    NotificationView,
    NotificationReadView,
    NotificationUnreadCountView,
    NotificationPreferenceView,
)

urlpatterns = [
    path("",               NotificationView.as_view()),
    path("read/",          NotificationReadView.as_view()),
    path("unread-count/",  NotificationUnreadCountView.as_view()),
    path("preferences/",   NotificationPreferenceView.as_view()),
]