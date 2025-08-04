from rest_framework import serializers
from django.utils.translation import gettext as _
from core.constants import CartSettings

class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(
        min_value=1,
        max_value=CartSettings.MAX_QUANTITY_PER_ITEM,
        error_messages={
            'min_value': _('Quantity must be at least 1'),
            'max_value': _('You can only add up to %(max)s items') % {'max': CartSettings.MAX_QUANTITY_PER_ITEM}
        }
    )

class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(default=1, min_value=1)

class UpdateCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)

class RemoveFromCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
