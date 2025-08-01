from enum import Enum

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

class PaymentMethod(str, Enum):
    """Payment methods enumeration"""
    COD = 'COD'
    BANK_TRANSFER = 'BANK_TRANSFER'
    CREDIT_CARD = 'CREDIT_CARD'

    @classmethod
    def choices(cls):
        return [(method.value, method.name.replace('_', ' ').title()) 
                for method in cls]

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
        return [(status.value, status.value.title()) for status in cls]
