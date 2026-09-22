from django.db.models.signals import post_save
from django.dispatch import receiver
from user.models import CustomUser
from .models import NotificationPreference


@receiver(post_save, sender=CustomUser)
def create_notification_preference(sender, instance, created, **kwargs):
    """Auto-create default NotificationPreference on user registration."""
    if created:
        NotificationPreference.objects.get_or_create(user=instance)