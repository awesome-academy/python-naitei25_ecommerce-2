from __future__ import annotations

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from products.models import Category
from products.models import Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        if self.instance is None and Category.objects.filter(name=value).exists():
            raise serializers.ValidationError(_("Category with this name already exists."))
        return value


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    first_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'price',
            'first_image',
            'category',
            'is_in_stock',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_first_image(self, obj):
        if obj.image_urls and len(obj.image_urls) > 0:
            return obj.image_urls[0]
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',
            'image_urls',
            'category',
            'specification',
            'is_in_stock',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
