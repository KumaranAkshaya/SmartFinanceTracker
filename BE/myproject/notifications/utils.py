import datetime
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .models import Notification, NotificationPreference


# ─────────────────────────────────────────────────────────────────
# CORE HELPER — create a notification + optionally send email
# ─────────────────────────────────────────────────────────────────
def create_notification(
    user,
    title,
    message,
    notification_type="general",
    priority="medium",
    redirect_url=None,
    meta=None,
    send_email=False,
):
    """
    Creates an in-app Notification record.
    If send_email=True and the user has email enabled for this type,
    dispatches an email as well.
    """
    # Check in-app preference
    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    inapp_field = f"{notification_type}_inapp"
    if hasattr(pref, inapp_field) and not getattr(pref, inapp_field):
        return None   # user opted out of this type in-app

    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        priority=priority,
        redirect_url=redirect_url,
        meta=meta,
    )

    # Email dispatch
    if send_email:
        email_field = f"{notification_type}_email"
        if hasattr(pref, email_field) and getattr(pref, email_field):
            _send_email_notification(user, title, message)
            notification.is_sent = True
            notification.save()

    return notification


def _send_email_notification(user, subject, message):
    """Thin wrapper around Django's send_mail."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass   # never crash the request on email failure


# ─────────────────────────────────────────────────────────────────
# TRIGGER FUNCTIONS — called from other apps or the scheduler
# ─────────────────────────────────────────────────────────────────

def notify_budget_alert(budget, alert_type):
    """Called from budget/utils.py when threshold / exceeded fires."""
    if alert_type == "threshold":
        title    = f"⚠️ Budget Warning — {budget.category.name}"
        message  = (
            f"You've used {budget.usage_percentage}% of your "
            f"'{budget.category.name}' budget for "
            f"{budget.month}/{budget.year}.\n"
            f"Spent: ₹{budget.spent_amount}  |  Limit: ₹{budget.limit_amount}"
        )
        priority = "medium"
    else:
        title    = f"🚨 Budget Exceeded — {budget.category.name}"
        message  = (
            f"You've exceeded your '{budget.category.name}' budget for "
            f"{budget.month}/{budget.year}!\n"
            f"Spent: ₹{budget.spent_amount}  |  Limit: ₹{budget.limit_amount}"
        )
        priority = "high"

    create_notification(
        user=budget.user,
        title=title,
        message=message,
        notification_type="budget_alert",
        priority=priority,
        redirect_url="/budget/",
        meta={"budget_id": budget.id, "alert_type": alert_type},
        send_email=True,
    )


def notify_emi_reminders():
    """
    Scheduled daily job.
    Reminds users about EMIs due within their configured reminder window.
    """
    from expenses.models import EMILoan

    today = datetime.date.today()
    active_loans = EMILoan.objects.filter(is_active=True).select_related("user")

    for loan in active_loans:
        pref, _ = NotificationPreference.objects.get_or_create(user=loan.user)
        days_before = pref.emi_reminder_days_before

        # Find the next EMI date (same day-of-month, current or next month)
        try:
            next_emi = loan.emi_start_date.replace(
                year=today.year, month=today.month
            )
        except ValueError:
            # Handle months with fewer days (e.g. Feb 30 → use last day)
            import calendar
            last_day = calendar.monthrange(today.year, today.month)[1]
            next_emi = today.replace(day=last_day)

        if next_emi < today:
            # Already passed this month — push to next month
            if today.month == 12:
                next_emi = next_emi.replace(year=today.year + 1, month=1)
            else:
                next_emi = next_emi.replace(month=today.month + 1)

        days_until = (next_emi - today).days

        if days_until == days_before:
            # Avoid duplicate reminders for same loan + due date
            already_sent = Notification.objects.filter(
                user=loan.user,
                notification_type="emi_reminder",
                meta__loan_id=loan.id,
                meta__due_date=str(next_emi),
            ).exists()

            if not already_sent:
                create_notification(
                    user=loan.user,
                    title=f"📅 EMI Due in {days_before} Days — {loan.lender_name}",
                    message=(
                        f"Your {loan.get_loan_type_display()} EMI of ₹{loan.emi_amount} "
                        f"to {loan.lender_name} is due on {next_emi.strftime('%d %b %Y')}."
                    ),
                    notification_type="emi_reminder",
                    priority="high",
                    redirect_url="/expenses/emi/",
                    meta={"loan_id": loan.id, "due_date": str(next_emi)},
                    send_email=True,
                )


def notify_savings_reminder():
    """
    Scheduled monthly job (run on 1st of each month).
    Reminds users to contribute to their active saving goals.
    """
    from expenses.models import Saving

    savings = Saving.objects.filter(is_active=True).select_related("user")

    for saving in savings:
        if saving.monthly_contribution > 0:
            create_notification(
                user=saving.user,
                title=f"💰 Savings Reminder — {saving.name}",
                message=(
                    f"Don't forget your monthly contribution of "
                    f"₹{saving.monthly_contribution} towards '{saving.name}'.\n"
                    f"Progress: ₹{saving.current_amount} / ₹{saving.target_amount}"
                ),
                notification_type="savings_reminder",
                priority="low",
                redirect_url="/savings/",
                meta={"saving_id": saving.id},
                send_email=False,
            )


def notify_monthly_report(user, month, year, summary: dict):
    """
    Called from a scheduled end-of-month job.
    Sends a summary notification + email.
    """
    import calendar
    month_name = calendar.month_name[month]

    create_notification(
        user=user,
        title=f"📊 Monthly Report — {month_name} {year}",
        message=(
            f"Your {month_name} {year} summary:\n"
            f"Income   : ₹{summary.get('total_income', 0)}\n"
            f"Expenses : ₹{summary.get('total_expense', 0)}\n"
            f"Savings  : ₹{summary.get('net_savings', 0)}\n"
            f"Savings Rate: {summary.get('savings_rate', 0)}%"
        ),
        notification_type="monthly_report",
        priority="medium",
        redirect_url=f"/analytics/?month={month}&year={year}",
        meta={"month": month, "year": year, **summary},
        send_email=True,
    )


def notify_goal_achieved(saving):
    """Called when saving.current_amount >= saving.target_amount."""
    create_notification(
        user=saving.user,
        title=f"🎉 Goal Achieved — {saving.name}!",
        message=(
            f"Congratulations! You've reached your savings goal of "
            f"₹{saving.target_amount} for '{saving.name}'."
        ),
        notification_type="goal_achieved",
        priority="high",
        redirect_url="/savings/",
        meta={"saving_id": saving.id},
        send_email=True,
    )


def notify_investment_update(investment, gain_loss, return_pct):
    """Called periodically to update users on investment performance."""
    direction = "📈 gained" if gain_loss >= 0 else "📉 lost"

    create_notification(
        user=investment.user,
        title=f"Investment Update — {investment.name}",
        message=(
            f"Your investment '{investment.name}' has {direction} "
            f"₹{abs(gain_loss)} ({return_pct}% return).\n"
            f"Invested: ₹{investment.invested_amount}  |  "
            f"Current Value: ₹{investment.current_value}"
        ),
        notification_type="investment_update",
        priority="low",
        redirect_url="/investments/",
        meta={
            "investment_id": investment.id,
            "gain_loss": float(gain_loss),
            "return_pct": float(return_pct),
        },
        send_email=False,
    )