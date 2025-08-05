from django.contrib import admin
from .models import Order, OrderItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_name', 'user', 'order_status', 'ordered_at')
    list_filter = ('order_status', 'payment_method')
    search_fields = ('customer_name', 'user__email')

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product', 'quantity', 'price_at_order')
    list_filter = ('product',)
