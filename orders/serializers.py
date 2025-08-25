# orders/serializers.py

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from .models import Order, OrderItem, Coupon
from core.constants import OrderStatus, CancelReason, FieldLengths, DecimalSettings


class CouponSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = (
            'id',
            'code',
            'discount_percent',
            'max_discount_amount',
            'expires_at',
            'usage_limit',
            'times_used',
            'status',
            'is_valid',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'times_used',
            'status',
            'is_valid',
            'created_at',
            'updated_at',
        )

    def get_status(self, obj):
        from django.utils import timezone
        
        if obj.expires_at and obj.expires_at < timezone.now():
            return 'EXPIRED'
        
        if obj.usage_limit and obj.times_used >= obj.usage_limit:
            return 'USAGE_LIMIT_REACHED'
            
        return 'VALID'

    def get_is_valid(self, obj):
        return obj.is_valid()


class CouponApplySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=FieldLengths.DEFAULT)  # Sử dụng const
    total_amount = serializers.DecimalField(
        max_digits=DecimalSettings.PRICE_MAX_DIGITS,
        decimal_places=DecimalSettings.PRICE_DECIMAL_PLACES,
        required=False,
        help_text=_("Total amount to calculate discount for")  # I18n text
    )

    def validate_code(self, value):
        try:
            coupon = Coupon.objects.get(code=value.upper())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError(_("Invalid coupon code"))  # I18n message
        
        if not coupon.is_valid():
            raise serializers.ValidationError(_("Coupon is no longer valid"))  # I18n message
            
        return coupon


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
    items = OrderItemSerializer(many=True, read_only=True)
    can_cancel = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    coupon_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    coupon_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'customer_name',
            'user_email',
            'customer_phone',
            'customer_address',
            'total_amount',
            'discount_amount',
            'final_amount',
            'payment_method',
            'order_status',
            'ordered_at',
            'items',
            'cancel_reason',
            'can_cancel',
            'coupon',
            'coupon_code',
            'coupon_info',
        )
        read_only_fields = (
            'id',
            'ordered_at',
            'items',
            'total_amount',
            'discount_amount',
            'final_amount',
            'can_cancel',
            'user_email',
            'coupon',
            'coupon_info',
        )

    def get_can_cancel(self, obj):  
        return obj.order_status == OrderStatus.PENDING.value

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_coupon_info(self, obj):
        if obj.coupon:
            return CouponSerializer(obj.coupon).data
        return None

    def create(self, validated_data):
        validated_data.pop("coupon_code", None)
        return super().create(validated_data)
