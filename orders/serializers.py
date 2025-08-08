# orders/serializers.py

from rest_framework import serializers
from .models import Order, OrderItem
from core.constants import OrderStatus, CancelReason

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
    can_cancel = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'customer_name',
            'user_email',
            'customer_phone',
            'customer_address',
            'total_amount',
            'payment_method',
            'order_status',
            'ordered_at',
            'items',
            'cancel_reason',
            'can_cancel',
        )
        read_only_fields = (
            'id',
            'ordered_at',
            'items',
            'total_amount',   
            'can_cancel',
            'user_email',
        )

    def get_can_cancel(self, obj):  
        return obj.order_status == OrderStatus.PENDING.value

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
