from __future__ import annotations
from django.utils.translation import gettext_lazy as _

from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from core.constants import DecimalSettings
from core.constants import FieldLengths
from core.constants import OrderStatus
from core.constants import PaymentMethod
from core.constants import CancelReason
from core.models import BaseModel
from decimal import Decimal


class Coupon(BaseModel):
    code = models.CharField(
        max_length=FieldLengths.DEFAULT,
        unique=True,
        help_text=_("Coupon code entered by the user")
    )
    discount_percent = models.DecimalField(
        max_digits=DecimalSettings.DISCOUNT_PERCENT_MAX_DIGITS,
        decimal_places=DecimalSettings.DISCOUNT_PERCENT_DECIMAL_PLACES,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Discount percentage (0-100)")
    )
    max_discount_amount = models.DecimalField(
        max_digits=DecimalSettings.PRICE_MAX_DIGITS,
        decimal_places=DecimalSettings.PRICE_DECIMAL_PLACES,
        help_text=_("Maximum discount amount")
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Expiration date of the coupon")
    )
    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=1,
        help_text=_("Number of times the coupon can be used (NULL = unlimited)")
    )
    times_used = models.PositiveIntegerField(
        default=0,
        help_text=_("Number of times this coupon has been used")
    )

    class Meta:
        db_table = 'coupons'
        indexes = [
            models.Index(fields=['code'], name='idx_coupons_code'),
            models.Index(fields=['expires_at'], name='idx_coupons_expires_at'),
        ]

    def __str__(self):
        return f"{self.code} - {self.discount_percent}% off"

    def is_valid(self):
        """Check if coupon is still valid"""
        from django.utils import timezone
        
        if self.expires_at and self.expires_at < timezone.now():
            return False
        
        if self.usage_limit and self.times_used >= self.usage_limit:
            return False
            
        return True

    def apply_discount(self, total_amount):
        if not self.is_valid():
            return total_amount, Decimal("0.00")

        if not isinstance(total_amount, Decimal):
            total_amount = Decimal(str(total_amount))

        discount_rate = self.discount_percent / Decimal("100")
        discount_amount = total_amount * discount_rate
        
        discount_amount = min(discount_amount, self.max_discount_amount)
        final_amount = max(total_amount - discount_amount, Decimal("0.00"))
        
        return final_amount, discount_amount


class Order(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name='orders',
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.RESTRICT,  
        null=True,
        blank=True,
        related_name='orders',
    )
    cancel_reason = models.CharField(
        max_length=FieldLengths.DEFAULT,
        choices=CancelReason.choices(),
        null=True,
        blank=True,
    )
    customer_name = models.CharField(max_length=FieldLengths.DEFAULT)
    customer_phone = models.CharField(max_length=FieldLengths.PHONE)
    customer_address = models.TextField()
    total_amount = models.DecimalField(
        max_digits=DecimalSettings.PRICE_MAX_DIGITS,
        decimal_places=DecimalSettings.PRICE_DECIMAL_PLACES,
    )
    discount_amount = models.DecimalField(
        max_digits=DecimalSettings.PRICE_MAX_DIGITS,
        decimal_places=DecimalSettings.PRICE_DECIMAL_PLACES,
        default=0,
        help_text=_("Amount discounted by coupon")
    )
    final_amount = models.DecimalField(
        max_digits=DecimalSettings.PRICE_MAX_DIGITS,
        decimal_places=DecimalSettings.PRICE_DECIMAL_PLACES,
        default=0,
        help_text=_("Total amount after discount")
    )
    payment_method = models.CharField(
        max_length=FieldLengths.DEFAULT,
        choices=PaymentMethod.choices(),
        default=PaymentMethod.COD.value,
    )
    order_status = models.CharField(
        max_length=FieldLengths.DEFAULT,
        choices=OrderStatus.choices(),
        default=OrderStatus.PENDING.value,
    )
    ordered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders'
        indexes = [
            models.Index(fields=['user'], name='idx_orders_user_id'),
            models.Index(fields=['coupon'], name='idx_orders_coupon_id'),
        ]

    def __str__(self):
        return f"Order #{self.id} by {self.customer_name}"

    def save(self, *args, **kwargs):
        """Calculate final amount before saving"""
        if not self.final_amount:
            self.final_amount = self.total_amount - self.discount_amount
        super().save(*args, **kwargs)


class OrderItem(BaseModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.RESTRICT,
    )
    quantity = models.PositiveIntegerField()
    price_at_order = models.DecimalField(
        max_digits=DecimalSettings.PRICE_MAX_DIGITS,
        decimal_places=DecimalSettings.PRICE_DECIMAL_PLACES,
    )

    class Meta:
        db_table = 'order_items'
        indexes = [
            models.Index(fields=['order'], name='idx_order_items_order_id'),
            models.Index(fields=['product'],
                         name='idx_order_items_product_id'),
        ]
