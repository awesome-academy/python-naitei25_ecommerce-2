from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price_at_order')
    can_delete = False

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_name', 'user', 'order_status', 'ordered_at')
    list_filter = ('order_status', 'payment_method')
    search_fields = ('customer_name', 'user__email')
    inlines = [OrderItemInline]
    readonly_fields = ('ordered_at', 'total_amount')
    list_editable = ('order_status',)

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product', 'quantity', 'price_at_order')
    list_filter = ('product',)
