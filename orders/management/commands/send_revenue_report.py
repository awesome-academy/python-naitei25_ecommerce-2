from django.core.management.base import BaseCommand
from orders.tasks import send_monthly_revenue_report
from django.utils.translation import gettext_lazy as _
class Command(BaseCommand):
    help = _('Send monthly revenue report to admins')

    def handle(self, *args, **kwargs):
        result = send_monthly_revenue_report()
        self.stdout.write(self.style.SUCCESS(result))
