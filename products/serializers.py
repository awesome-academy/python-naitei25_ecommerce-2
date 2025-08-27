from __future__ import annotations

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from products.models import Category
from products.models import Product
from orders.models import FlashSale
from django.utils import timezone
from decimal import Decimal

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        if self.instance is None and Category.objects.filter(name=value).exists():
            raise serializers.ValidationError(_("Category with this name already exists."))
        return value


class AdminProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',
            'image_urls',
            'category',
            'category_name',
            'specification',
            'is_in_stock',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'category_name']
    
    def validate_image_urls(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(_("Image URLs must be a list."))
        return value
    
    def validate_specification(self, value):
        if not isinstance(value, (list, dict)):
            raise serializers.ValidationError(_("Specification must be a list or dict."))
        return value
    
class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    first_image = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    flash_sale_info = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'price',             # giá gốc
            'effective_price',   # giá cuối cùng hiển thị
            'sale_price',        # giá giảm (nếu có)
            'discount_percent',  # % giảm
            'flash_sale_info',   # thông tin flash sale
            'first_image',
            'category',
            'is_in_stock',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_first_image(self, obj):
        return obj.first_image_url

    def _get_active_flash_sale(self, obj):
        now = timezone.now()
        return (
            FlashSale.objects
            .filter(
                is_active=True,
                start_date__lte=now,
                end_date__gte=now,
                products=obj
            )
            .order_by('-discount_percent')
            .first()
        )

    def get_effective_price(self, obj):
        fs = self._get_active_flash_sale(obj)
        if fs:
            return str(fs.calculate_sale_price(obj.price).quantize(Decimal("0.01")))
        return str(obj.price.quantize(Decimal("0.01")))

    def get_sale_price(self, obj):
        fs = self._get_active_flash_sale(obj)
        if fs:
            return str(fs.calculate_sale_price(obj.price).quantize(Decimal("0.01")))
        return None

    def get_discount_percent(self, obj):
        fs = self._get_active_flash_sale(obj)
        return float(fs.discount_percent) if fs else None

    def get_flash_sale_info(self, obj):
        fs = self._get_active_flash_sale(obj)
        if not fs:
            return None
        return {
            "id": fs.id,
            "name": fs.name,
            "end_date": fs.end_date,
            "remaining_time": fs.get_remaining_time().total_seconds() if fs.get_remaining_time() else 0,
        }


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    effective_price = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    flash_sale_info = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',             # original price
            'effective_price',   # final price shown
            'sale_price',        # discounted price (if any)
            'discount_percent',  # <-- FIX: add comma here
            'flash_sale_info',   # <-- FIX: include this so the field is returned
            'image_urls',
            'category',
            'specification',
            'is_in_stock',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def _get_active_flash_sale(self, obj):
        now = timezone.now()
        return (
            FlashSale.objects
            .filter(
                is_active=True,
                start_date__lte=now,
                end_date__gte=now,
                products=obj
            )
            .order_by('-discount_percent')
            .first()
        )

    def get_effective_price(self, obj):
        fs = self._get_active_flash_sale(obj)
        if fs:
            return str(fs.calculate_sale_price(obj.price).quantize(Decimal("0.01")))
        return str(obj.price.quantize(Decimal("0.01")))

    def get_sale_price(self, obj):
        fs = self._get_active_flash_sale(obj)
        if fs:
            return str(fs.calculate_sale_price(obj.price).quantize(Decimal("0.01")))
        return None

    def get_discount_percent(self, obj):
        fs = self._get_active_flash_sale(obj)
        return float(fs.discount_percent) if fs else None

    def get_flash_sale_info(self, obj):
        fs = self._get_active_flash_sale(obj)
        if not fs:
            return None
        remaining = fs.get_remaining_time()
        return {
            "id": fs.id,
            "name": fs.name,
            "end_date": fs.end_date,
            "remaining_time": remaining.total_seconds() if remaining else 0,
        }

class ProductInstantSerializer(serializers.ModelSerializer):
    first_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "price", "first_image", "is_in_stock")

    def get_first_image(self, obj):
        if obj.image_urls and len(obj.image_urls) > 0:
            return obj.image_urls[0]
        return None