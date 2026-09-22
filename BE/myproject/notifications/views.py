from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


def custom_response(success, message, data=None, status_code=200):
    return Response({
        "success": success,
        "message": message,
        "data": data
    }, status=status_code)


# ─────────────────────────────────────────────
# 1. NOTIFICATIONS FEED
# ─────────────────────────────────────────────
class NotificationView(APIView):
    """
    GET    /notifications/            → all notifications (paginated)
    DELETE /notifications/?notif_id=  → delete one notification
    DELETE /notifications/?clear=all  → delete all read notifications
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(user=request.user)

        # ── Filters ─────────────────────────────────────
        notif_type = request.query_params.get("type")
        is_read    = request.query_params.get("is_read")    # true / false
        priority   = request.query_params.get("priority")

        if notif_type:
            notifs = notifs.filter(notification_type=notif_type)
        if is_read is not None:
            notifs = notifs.filter(is_read=is_read.lower() == "true")
        if priority:
            notifs = notifs.filter(priority=priority)

        # ── Pagination ───────────────────────────────────
        page      = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        start     = (page - 1) * page_size
        end       = start + page_size

        total     = notifs.count()
        unread    = notifs.filter(is_read=False).count()
        paginated = notifs[start:end]

        return custom_response(True, "Notifications fetched", {
            "total": total,
            "unread": unread,
            "page": page,
            "page_size": page_size,
            "total_pages": -(-total // page_size),
            "results": NotificationSerializer(paginated, many=True).data,
        })

    def delete(self, request):
        clear = request.query_params.get("clear")

        if clear == "all":
            Notification.objects.filter(user=request.user, is_read=True).delete()
            return custom_response(True, "All read notifications cleared")

        notif_id = request.query_params.get("notif_id")
        notif    = Notification.objects.filter(id=notif_id, user=request.user).first()
        if not notif:
            return custom_response(False, "Notification not found", status_code=status.HTTP_404_NOT_FOUND)

        notif.delete()
        return custom_response(True, "Notification deleted")


# ─────────────────────────────────────────────
# 2. MARK AS READ
# ─────────────────────────────────────────────
class NotificationReadView(APIView):
    """
    PUT /notifications/read/?notif_id=   → mark one as read
    PUT /notifications/read/?mark=all    → mark all as read
    """
    permission_classes = [IsAuthenticated]

    def put(self, request):
        mark = request.query_params.get("mark")

        if mark == "all":
            Notification.objects.filter(
                user=request.user, is_read=False
            ).update(is_read=True, read_at=timezone.now())
            return custom_response(True, "All notifications marked as read")

        notif_id = request.query_params.get("notif_id")
        notif    = Notification.objects.filter(id=notif_id, user=request.user).first()
        if not notif:
            return custom_response(False, "Notification not found", status_code=status.HTTP_404_NOT_FOUND)

        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save()
        return custom_response(True, "Notification marked as read", NotificationSerializer(notif).data)


# ─────────────────────────────────────────────
# 3. UNREAD COUNT  (for the bell badge)
# ─────────────────────────────────────────────
class NotificationUnreadCountView(APIView):
    """
    GET /notifications/unread-count/  → {unread: N}
    Lightweight endpoint polled by the frontend bell icon.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unread = Notification.objects.filter(user=request.user, is_read=False).count()
        return custom_response(True, "Unread count fetched", {"unread": unread})


# ─────────────────────────────────────────────
# 4. NOTIFICATION PREFERENCES
# ─────────────────────────────────────────────
class NotificationPreferenceView(APIView):
    """
    GET /notifications/preferences/   → fetch current preferences
    PUT /notifications/preferences/   → update preferences
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return custom_response(
            True, "Preferences fetched",
            NotificationPreferenceSerializer(pref).data
        )

    def put(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return custom_response(True, "Preferences updated", serializer.data)
        return custom_response(False, "Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)