from __future__ import annotations

from enum import Enum
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

class FieldLengths:
    """Constants for field lengths"""
    DEFAULT = 255
    NAME = 100
    EMAIL = 255
    PHONE = 20
    URL = 255
    PASSWORD = 255
    ADDRESS = 1000


class DecimalSettings:
    """Constants for decimal fields"""
    PRICE_MAX_DIGITS = 10
    PRICE_DECIMAL_PLACES = 2
    DISCOUNT_PERCENT_MAX_DIGITS = 5
    DISCOUNT_PERCENT_DECIMAL_PLACES = 2


class PaginationSettings:
    """Constants for pagination"""
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    USER_LIST_PAGE_SIZE = 20


class PaymentMethod(str, Enum):
    """Payment methods enumeration"""
    COD = 'COD'
    BANK_TRANSFER = 'BANK_TRANSFER'
    CREDIT_CARD = 'CREDIT_CARD'

    @classmethod
    def choices(cls):
        return [
            (method.value, method.name.replace('_', ' ').title())
            for method in cls
        ]


class OrderStatus(str, Enum):
    """Order status enumeration"""
    PENDING = 'PENDING'
    CONFIRMED = 'CONFIRMED'
    PROCESSING = 'PROCESSING'
    SHIPPED = 'SHIPPED'
    DELIVERED = 'DELIVERED'
    CANCELLED = 'CANCELLED'

    @classmethod
    def choices(cls):
        return [(status.value, _(status.value.title())) for status in cls]

class CartSettings:
    """Constants related to cart behavior"""
    MAX_QUANTITY_PER_ITEM = 100

class CancelReason(str, Enum):
    """Cancel order reasons enumeration"""
    CHANGE_MIND = 'CHANGE_MIND'
    FOUND_CHEAPER = 'FOUND_CHEAPER'
    WRONG_ORDER  = 'WRONG_ORDER'
    OTHER = 'OTHER'

    @classmethod
    def choices(cls):
        return [
            (reason.value, _(reason.name.replace('_', ' ').title()))
            for reason in cls
        ]

class CouponStatus(str, Enum):
    """Coupon status enumeration"""
    VALID = 'VALID'
    EXPIRED = 'EXPIRED'
    USAGE_LIMIT_REACHED = 'USAGE_LIMIT_REACHED'
    INVALID = 'INVALID'

    @classmethod
    def choices(cls):
        return [(status.value, _(status.value.replace('_', ' ').title())) for status in cls]

class FlashSaleStatus(str, Enum):
    """Flash sale status enumeration"""
    UPCOMING = 'UPCOMING'
    ACTIVE = 'ACTIVE'
    EXPIRED = 'EXPIRED'
    INACTIVE = 'INACTIVE'

    @classmethod
    def choices(cls):
        return [(status.value, _(status.value.title())) for status in cls]


class FlashSaleSettings:
    """Constants for flash sale behavior"""
    MAX_NAME_LENGTH = 255
    MIN_DISCOUNT_PERCENT = Decimal('0')
    MAX_DISCOUNT_PERCENT = Decimal('100')
    MIN_DURATION_HOURS = 1
