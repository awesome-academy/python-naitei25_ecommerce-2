from __future__ import annotations
import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from core.constants import EmailTemplates, EmailSubjects

logger = logging.getLogger(__name__)

class OrderEmailService:
    """Service for sending order-related emails"""
    
    @staticmethod
    def send_order_email(order, user_email, email_type, context):
        """
        Generic method to send order-related emails
        
        Args:
            order: Order object
            user_email: Recipient email address
            email_type: Type of email ('placed', 'cancelled', 'delivered')
            context: Template context data
        """
        try:
            # Map email type to subject and template
            email_config = {
                'placed': {
                    'subject': EmailSubjects.ORDER_PLACED,
                    'template': EmailTemplates.ORDER_PLACED
                },
                'cancelled': {
                    'subject': EmailSubjects.ORDER_CANCELLED,
                    'template': EmailTemplates.ORDER_CANCELLED
                },
                'delivered': {
                    'subject': EmailSubjects.ORDER_DELIVERED,
                    'template': EmailTemplates.ORDER_DELIVERED
                }
            }
            
            if email_type not in email_config:
                logger.error(_("Invalid email type: %(email_type)s") % {'email_type': email_type})
                return
            
            config = email_config[email_type]
            subject = _(config['subject']).format(order_id=order.id)
            html_content = render_to_string(config['template'], context)
            
            send_mail(
                subject,
                '',  # Empty plain text message
                settings.DEFAULT_FROM_EMAIL,
                [user_email],
                html_message=html_content,
                fail_silently=False,
            )
            
            logger.info(_("Order %(email_type)s email sent for order #%(order_id)s to %(user_email)s") % {
                'email_type': email_type,
                'order_id': order.id,
                'user_email': user_email
            })
            
        except Exception as e:
            logger.exception(_("Failed to send order %(email_type)s email for order #%(order_id)s: %(error)s") % {
                'email_type': email_type,
                'order_id': order.id,
                'error': str(e)
            })
    
    # Convenience methods for specific email types
    @staticmethod
    def send_order_placed_email(order, user_email, context):
        """Send email when order is placed"""
        OrderEmailService.send_order_email(
            order, user_email, 'placed', context
        )
    
    @staticmethod
    def send_order_cancelled_email(order, user_email, context):
        """Send email when order is cancelled"""
        OrderEmailService.send_order_email(
            order, user_email, 'cancelled', context
        )
    
    @staticmethod
    def send_order_delivered_email(order, user_email, context):
        """Send email when order is delivered"""
        OrderEmailService.send_order_email(
            order, user_email, 'delivered', context
        )
