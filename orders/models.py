from __future__ import annotations

from django.conf import settings
from django.db import models

from core.constants import DecimalSettings
from core.constants import FieldLengths
from core.constants import OrderStatus
from core.constants import PaymentMethod
from core.constants import CancelReason
from core.models import BaseModel


class Order(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
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
        ]

    def __str__(self):
        return f"Order #{self.id} by {self.customer_name}"


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
