from __future__ import annotations

from django.conf import settings
from django.core.validators import MaxValueValidator
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Avg

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

    @property
    def average_rating(self):
        avg = self.reviews.aggregate(avg_rating=Avg('rating'))['avg_rating']
        return round(avg, 1) if avg else 0.0

    @property
    def total_reviews(self):
        return self.reviews.count()


class ProductReview(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='product_reviews',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Rating from 1 to 5 stars',
    )
    title = models.CharField(
        max_length=FieldLengths.DEFAULT,
        blank=True,
        help_text='Optional review title',
    )
    comment = models.TextField(
        blank=True,
        help_text='Optional review comment',
    )
    is_verified_purchase = models.BooleanField(
        default=False,
        help_text='Whether this review is from a verified purchase',
    )

    class Meta:
        db_table = 'product_reviews'
        indexes = [
            models.Index(fields=['product'], name='idx_reviews_product_id'),
            models.Index(fields=['user'], name='idx_reviews_user_id'),
            models.Index(fields=['rating'], name='idx_reviews_rating'),
            models.Index(fields=['created_at'], name='idx_reviews_created_at'),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.product.name} ({self.rating}/5)"

    def save(self, *args, **kwargs):
        # Check if user has purchased this product to set verified_purchase
        if not self.pk:  # Only on creation
            from orders.models import OrderItem
            has_purchased = OrderItem.objects.filter(
                order__user=self.user,
                product=self.product,
                order__order_status__in=['DELIVERED', 'CONFIRMED'],
            ).exists()
            self.is_verified_purchase = has_purchased
        super().save(*args, **kwargs)
