# orders/management/commands/test_order_emails.py
from django.core.management.base import BaseCommand
from orders.services.email_service import OrderEmailService
from django.utils.translation import gettext_lazy as _
from django.conf import settings

class Command(BaseCommand):
    help = _('Test order email templates')

    def handle(self, *args, **options):
        # Test data chung với i18n
        base_context = {
            'customer_name': _('John Doe'),
            'order_id': 12345,
            'order_date': _('2024-01-15 14:30'),
            'total_amount': '99.99',
            'currency': getattr(settings, "CURRENCY_CODE", "USD"),
            'shipping_address': _('123 Test Street, Test City'),
        }

        # Test 1: Email đặt hàng thành công (Order Placed)
        order_placed_context = base_context.copy()
        OrderEmailService.send_order_placed_email(
            order=type('Obj', (), {'id': 12345})(),
            user_email='nhanarceusboss@gmail.com',
            context=order_placed_context
        )
        self.stdout.write(self.style.SUCCESS(_('Test email for order placed sent successfully')))

        # Test 2: Email hủy đơn hàng (Order Cancelled)
        order_cancelled_context = base_context.copy()
        order_cancelled_context.update({
            'cancel_reason': _('Change of mind'),
            'refund_amount': '99.99',
        })
        OrderEmailService.send_order_cancelled_email(
            order=type('Obj', (), {'id': 12346})(),
            user_email='nhanarceusboss@gmail.com',
            context=order_cancelled_context
        )
        self.stdout.write(self.style.SUCCESS(_('Test email for order cancelled sent successfully')))

        # Test 3: Email giao hàng thành công (Order Delivered)
        order_delivered_context = base_context.copy()
        order_delivered_context.update({
            'delivery_date': _('2024-01-20 10:00'),
        })
        OrderEmailService.send_order_delivered_email(
            order=type('Obj', (), {'id': 12347})(),
            user_email='nhanarceusboss@gmail.com',
            context=order_delivered_context
        )
        self.stdout.write(self.style.SUCCESS(_('Test email for order delivered sent successfully')))
