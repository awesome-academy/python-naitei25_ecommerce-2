from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Order
from .services.email_service import OrderEmailService
from core.constants import OrderStatus
from django.utils import timezone
from django.conf import settings
from django.utils.translation import gettext_lazy as _

@receiver(post_save, sender=Order)
def order_status_change_handler(sender, instance, created, **kwargs):
    """Handle order status changes and send emails"""
    if created:
        # Send order confirmation email for new orders
        if instance.order_status == OrderStatus.PENDING.value:
            send_order_confirmation_email(instance)
        return
    
    # Check if status changed
    try:
        original = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return
        
    if original.order_status != instance.order_status:
        if instance.order_status == OrderStatus.CANCELLED.value:
            send_order_cancelled_email(instance)
        elif instance.order_status == OrderStatus.DELIVERED.value:
            send_order_delivered_email(instance)

def send_order_confirmation_email(order):
    """Send order confirmation email"""
    user_email = order.user.email if order.user else order.customer_email
    if not user_email:
        return
        
    currency = getattr(settings, "CURRENCY_CODE", "USD")
    context = {
        'customer_name': order.customer_name,
        'order_id': order.id,
        'order_date': order.ordered_at.strftime(_("%Y-%m-%d %H:%M")),
        'total_amount': f"{order.final_amount:.2f}",
        'currency': currency,
        'shipping_address': order.customer_address,
    }
    
    OrderEmailService.send_order_email(
        order, user_email, 'placed', context
    )

def send_order_cancelled_email(order):
    """Send order cancelled email"""
    user_email = order.user.email if order.user else order.customer_email
    if not user_email:
        return
        
    currency = getattr(settings, "CURRENCY_CODE", "USD")
    context = {
        'customer_name': order.customer_name,
        'order_id': order.id,
        'cancel_reason': order.get_cancel_reason_display() if order.cancel_reason else _("Not specified"),
        'refund_amount': f"{order.final_amount:.2f}",
        'currency': currency,
    }
    
    OrderEmailService.send_order_email(
        order, user_email, 'cancelled', context
    )

def send_order_delivered_email(order):
    """Send order delivered email"""
    user_email = order.user.email if order.user else order.customer_email
    if not user_email:
        return
        
    currency = getattr(settings, "CURRENCY_CODE", "USD")
    context = {
        'customer_name': order.customer_name,
        'order_id': order.id,
        'delivery_date': timezone.now().strftime(_("%Y-%m-%d %H:%M")),
        'currency': currency,
    }
    
    OrderEmailService.send_order_email(
        order, user_email, 'delivered', context
    )
