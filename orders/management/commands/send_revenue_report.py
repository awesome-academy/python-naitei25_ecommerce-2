from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from django.db.models import Sum, Count
from orders.models import Order
from django.conf import settings
from datetime import datetime, timedelta, time
from django.contrib.auth import get_user_model
from core.constants import OrderStatus
from django.utils.translation import gettext_lazy as _
import html

class Command(BaseCommand):
    help = _('Send monthly revenue report to admins')

    def handle(self, *args, **kwargs):
        User = get_user_model()
        admins = User.objects.filter(is_superuser=True)
        admin_emails = [admin.email for admin in admins if admin.email]

        if not admin_emails:
            self.stdout.write(self.style.WARNING(_('No admins found to send the report.')))
            return

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
        revenue = delivered_orders.aggregate(total_revenue=Sum('total_amount'))['total_revenue'] or 0

        month_year = first_day_last_month.strftime('%B %Y')
        subject = _(f'Monthly Revenue Report - {month_year}')
        
        html_content = f"""
        <html>
        <body>
            <h2>{_(f'Monthly Revenue Report - {month_year}')}</h2>
            <p>{_('Dear Admin,')}</p>
            <p>{_(f'Please find below the detailed revenue report for the month of {month_year}:')}</p>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
                <tr style="background-color: #f2f2f2;">
                    <th>{_('Metric')}</th>
                    <th>{_('Value')}</th>
                </tr>
                <tr>
                    <td>{_('Total Orders Delivered')}</td>
                    <td>{order_count}</td>
                </tr>
                <tr>
                    <td>{_('Total Revenue (USD)')}</td>
                    <td>{revenue:.2f}</td>
                </tr>
            </table>
            <p>{_(f'This report includes all orders with status DELIVERED in {month_year}.')}</p>
            <p>{_('Best regards,')}<br>{_('Python Intern Team')}</p>
        </body>
        </html>
        """

        send_mail(
            subject,
            '',
            settings.DEFAULT_FROM_EMAIL,
            admin_emails,
            html_message=html_content,
            fail_silently=False,
        )
        self.stdout.write(self.style.SUCCESS(_('Monthly revenue report sent successfully!')))
