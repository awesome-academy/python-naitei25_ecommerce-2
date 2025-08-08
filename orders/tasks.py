from __future__ import annotations
import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.db.models import Sum
from orders.models import Order
from django.conf import settings
from datetime import datetime, timedelta, time
from django.contrib.auth import get_user_model
from core.constants import OrderStatus
from django.utils.translation import gettext_lazy as _
from celery import shared_task

logger = logging.getLogger(__name__)

@shared_task
def send_monthly_revenue_report():
    User = get_user_model()
    admins = User.objects.filter(is_superuser=True)
    admin_emails = [admin.email for admin in admins if admin.email]

    if not admin_emails:
        logger.warning("No admins found to send revenue report.")
        return "No admins found."

    today = timezone.now().date()
    first_day_last_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    last_day_last_month = today.replace(day=1) - timedelta(days=1)

    start_dt = timezone.make_aware(datetime.combine(first_day_last_month, time(0, 0)))
    end_dt = timezone.make_aware(datetime.combine(last_day_last_month, time(23, 59, 59, 999999)))

    delivered_orders = Order.objects.filter(
        ordered_at__range=(start_dt, end_dt),
        order_status=OrderStatus.DELIVERED.value
    )
    order_count = delivered_orders.count()
    revenue = delivered_orders.aggregate(total_revenue=Sum("total_amount"))["total_revenue"] or 0

    month_year = first_day_last_month.strftime("%B %Y")
    subject = _(f"Monthly Revenue Report - {month_year}")
    currency = getattr(settings, "CURRENCY_CODE", "USD")

    html_content = render_to_string("orders/revenue_report_email.html", {
        "title": subject,
        "month_year": month_year,
        "order_count": order_count,
        "revenue": f"{revenue:.2f}",
        "currency": currency,
    })

    try:
        send_mail(
            subject,
            "",
            settings.DEFAULT_FROM_EMAIL,
            admin_emails,
            html_message=html_content,
            fail_silently=False,
        )
    except Exception as e:
        logger.exception("Failed to send revenue report email.")
        return f"Error sending email: {e}"

    return "Monthly revenue report sent successfully."
