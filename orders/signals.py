from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone
from django.utils.formats import date_format
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from .models import Order
from .services.email_service import OrderEmailService
from core.constants import OrderStatus
from decimal import Decimal

@receiver(post_save, sender=Order)
def order_status_change_handler(sender, instance, created, update_fields=None, **kwargs):
    """Handle order creation and status changes, and send emails safely."""

    def safe_send(func, *args, **kwargs):
        """Wrap email sending so it never crashes the request."""
        try:
            func(*args, **kwargs)
        except Exception as e:
            import logging
            logging.getLogger("orders").exception(
                "Email send failed for order #%s: %s", instance.id, str(e)
            )

    if created:
        # Send order confirmation email for new orders
        if instance.order_status == OrderStatus.PENDING.value:
            transaction.on_commit(lambda: safe_send(send_order_confirmation_email, instance))
        return

    # Handle status change — use update_fields if available
    if update_fields and "order_status" not in update_fields:
        return  # status not updated

    # At this point, we know status was updated in this save()
    if instance.order_status == OrderStatus.CANCELLED.value:
        transaction.on_commit(lambda: safe_send(send_order_cancelled_email, instance))
    elif instance.order_status == OrderStatus.DELIVERED.value:
        transaction.on_commit(lambda: safe_send(send_order_delivered_email, instance))
    elif instance.order_status == OrderStatus.REJECTED.value:  # 👈 add this
        transaction.on_commit(lambda: safe_send(send_order_rejected_email, instance))


def send_order_confirmation_email(order):
    """Send order confirmation email"""
    user_email = order.user.email if order.user else order.customer_email
    if not user_email:
        return

    currency = getattr(settings, "CURRENCY_CODE", "USD")
    context = {
        "customer_name": order.customer_name,
        "order_id": order.id,
        "order_date": date_format(timezone.localtime(order.ordered_at), format="DATETIME_FORMAT", use_l10n=True),
        "total_amount": str(order.final_amount.quantize(Decimal("0.01"))),  # safer Decimal
        "currency": currency,
        "shipping_address": order.customer_address,
    }

    OrderEmailService.send_order_email(order, user_email, "placed", context)


def send_order_cancelled_email(order):
    """Send order cancelled email"""
    user_email = order.user.email if order.user else order.customer_email
    if not user_email:
        return

    currency = getattr(settings, "CURRENCY_CODE", "USD")
    context = {
        "customer_name": order.customer_name,
        "order_id": order.id,
        "cancel_reason": order.get_cancel_reason_display() if order.cancel_reason else _("Not specified"),
        "refund_amount": str(order.final_amount.quantize(Decimal("0.01"))),
        "currency": currency,
    }

    OrderEmailService.send_order_email(order, user_email, "cancelled", context)


def send_order_delivered_email(order):
    """Send order delivered email"""
    user_email = order.user.email if order.user else order.customer_email
    if not user_email:
        return

    currency = getattr(settings, "CURRENCY_CODE", "USD")
    context = {
        "customer_name": order.customer_name,
        "order_id": order.id,
        "delivery_date": date_format(timezone.localtime(timezone.now()), format="DATETIME_FORMAT", use_l10n=True),
        "currency": currency,
    }

    OrderEmailService.send_order_email(order, user_email, "delivered", context)

def send_order_rejected_email(order):   # NEW
    """Send order rejected email"""
    user_email = order.user.email if order.user else order.customer_email
    if not user_email:
        return

    currency = getattr(settings, "CURRENCY_CODE", "USD")
    context = {
        "customer_name": order.customer_name,
        "order_id": order.id,
        "reject_reason": order.get_reject_reason_display() if order.reject_reason else _("Not specified"),
        "currency": currency,
    }
    OrderEmailService.send_order_email(order, user_email, "rejected", context)
