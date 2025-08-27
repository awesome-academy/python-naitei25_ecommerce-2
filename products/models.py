from __future__ import annotations

from django.db import models

from core.constants import DecimalSettings
from core.constants import FieldLengths
from core.models import BaseModel
from django.utils import timezone


class Category(BaseModel):
    name = models.CharField(
        max_length=FieldLengths.NAME,
        unique=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Product(BaseModel):
    name = models.CharField(max_length=FieldLengths.DEFAULT)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=DecimalSettings.PRICE_MAX_DIGITS,
        decimal_places=DecimalSettings.PRICE_DECIMAL_PLACES,
    )
    image_urls = models.JSONField(default=list)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products',
    )
    specification = models.JSONField(default=list)
    is_in_stock = models.BooleanField(default=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['category'], name='idx_products_category_id'),
        ]

    def __str__(self):
        return self.name

    @property
    def first_image_url(self):
        """
        Get the first image URL from the image_urls list.

        Useful for displaying the main product image in lists or details.
        """
        if self.image_urls and len(self.image_urls) > 0:
            return self.image_urls[0]
        return None

    @property
    def formatted_price(self):
        return f"{self.price:,.2f} VND"
