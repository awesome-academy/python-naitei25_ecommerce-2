# orders/serializers.py

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from .models import Order, OrderItem, Coupon
from core.constants import OrderStatus, CancelReason, FieldLengths, DecimalSettings, FlashSaleSettings, FlashSaleStatus
from .models import FlashSale
from products.serializers import ProductInstantSerializer
from django.utils import timezone
from decimal import Decimal
from products.models import Product


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


class FlashSaleSerializer(serializers.ModelSerializer):
    products = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Product.objects.all(),
        required=True
    )
    status = serializers.SerializerMethodField()
    remaining_time = serializers.SerializerMethodField()
    products_info = serializers.SerializerMethodField()

    class Meta:
        model = FlashSale
        fields = (
            'id',
            'name',
            'discount_percent',
            'products',
            'products_info',
            'start_date',
            'end_date',
            'is_active',
            'status',
            'remaining_time',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'status', 'remaining_time', 'products_info')

    def get_status(self, obj):
        """Get current status of flash sale"""
        now = timezone.now()
        if not obj.is_active:
            return FlashSaleStatus.INACTIVE.value
        elif now < obj.start_date:
            return FlashSaleStatus.UPCOMING.value
        elif now <= obj.end_date:
            return FlashSaleStatus.ACTIVE.value
        else:
            return FlashSaleStatus.EXPIRED.value

    def get_remaining_time(self, obj):
        """Get remaining time in seconds"""
        remaining = obj.get_remaining_time()
        return remaining.total_seconds() if remaining else 0

    def get_products_info(self, obj):
        """Get detailed product information"""
        return obj.get_products_info()

    def validate(self, data):
        """Validate flash sale data"""
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError(_("End date must be after start date"))
        
        if (data['discount_percent'] <= FlashSaleSettings.MIN_DISCOUNT_PERCENT or 
            data['discount_percent'] > FlashSaleSettings.MAX_DISCOUNT_PERCENT):
            raise serializers.ValidationError(
                _("Discount percent must be between {} and {}").format(
                    FlashSaleSettings.MIN_DISCOUNT_PERCENT,
                    FlashSaleSettings.MAX_DISCOUNT_PERCENT
                )
            )
        
        return data

class FlashSaleListSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = FlashSale
        fields = (
            'id',
            'name',
            'discount_percent',
            'start_date',
            'end_date',
            'is_active',
            'status',
            'product_count',
        )

    def get_product_count(self, obj):
        return obj.products.count()

    def get_status(self, obj):
        """Get current status of flash sale"""
        now = timezone.now()
        if not obj.is_active:
            return FlashSaleStatus.INACTIVE.value
        elif now < obj.start_date:
            return FlashSaleStatus.UPCOMING.value
        elif now <= obj.end_date:
            return FlashSaleStatus.ACTIVE.value
        else:
            return FlashSaleStatus.EXPIRED.value

class ActiveFlashSaleSerializer(serializers.ModelSerializer):
    products_info = serializers.SerializerMethodField()
    remaining_time = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = FlashSale
        fields = (
            'id',
            'name',
            'discount_percent',
            'products_info',
            'start_date',
            'end_date',
            'remaining_time',
            'status',
        )

    def get_products_info(self, obj):
        return obj.get_products_info()

    def get_remaining_time(self, obj):
        remaining = obj.get_remaining_time()
        return remaining.total_seconds() if remaining else 0

    def get_status(self, obj):  # THÊM PHƯƠNG THỨC NÀY
        """Get current status of flash sale"""
        now = timezone.now()
        if not obj.is_active:
            return FlashSaleStatus.INACTIVE.value
        elif now < obj.start_date:
            return FlashSaleStatus.UPCOMING.value
        elif now <= obj.end_date:
            return FlashSaleStatus.ACTIVE.value
        else:
            return FlashSaleStatus.EXPIRED.value
