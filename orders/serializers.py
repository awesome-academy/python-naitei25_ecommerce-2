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
            'product_image_url',  # ← new field
            'quantity',
            'price_at_order',
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

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
        read_only_fields = ('id', 'ordered_at', 'order_status')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
        return order
