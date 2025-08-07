# orders/serializers.py

from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product_name      = serializers.ReadOnlyField(source='product.name')
    product_image_url = serializers.ReadOnlyField(source='product.first_image_url')

    class Meta:
        model = OrderItem
        fields = (
            'product',
            'product_name',
            'product_image_url',
            'quantity',
            'price_at_order',
        )


class OrderSerializer(serializers.ModelSerializer):
    # items will only be used for read, never for create
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id',
            'customer_name',
            'customer_phone',
            'customer_address',
            'total_amount',
            'payment_method',
            'order_status',
            'ordered_at',
            'items',
        )
        read_only_fields = (
            'id',
            'ordered_at',
            'order_status',
            'items',
            'total_amount',   
        )
