from django.urls import path
from .views import (
    OrderListCreateAPIView, 
    OrderRetrieveUpdateDestroyAPIView,
    AdminOrderListAPIView,
    AdminOrderDetailAPIView,
    CouponValidateAPIView,
    AdminCouponListAPIView,
    AdminCouponDetailAPIView,
    AdminFlashSaleListCreateAPIView,
    AdminFlashSaleDetailAPIView,
    ActiveFlashSaleListAPIView,
    FlashSaleProductListAPIView,
    UpcomingFlashSaleListAPIView
)

app_name = 'orders'

urlpatterns = [
    path('api/orders/', OrderListCreateAPIView.as_view(), name='api_order_list_create'),
    path('api/orders/<int:pk>/', OrderRetrieveUpdateDestroyAPIView.as_view(), name='api_order_detail'),
    path('api/admin/orders/', AdminOrderListAPIView.as_view(), name='admin_order_list'),
    path('api/admin/orders/<int:pk>/', AdminOrderDetailAPIView.as_view(), name='admin_order_detail'),
    path('api/coupons/validate/', CouponValidateAPIView.as_view(), name='coupon_validate'),
    path('api/admin/coupons/', AdminCouponListAPIView.as_view(), name='admin_coupon_list'),
    path('api/admin/coupons/<int:pk>/', AdminCouponDetailAPIView.as_view(), name='admin_coupon_detail'),
    path('api/admin/flash-sales/', AdminFlashSaleListCreateAPIView.as_view(), name='admin_flash_sale_list'),
    path('api/admin/flash-sales/<int:pk>/', AdminFlashSaleDetailAPIView.as_view(), name='admin_flash_sale_detail'),
    path('api/flash-sales/active/', ActiveFlashSaleListAPIView.as_view(), name='active_flash_sales'),
    path('api/flash-sales/<int:pk>/products/', FlashSaleProductListAPIView.as_view(), name='flash_sale_products'),
    path('api/flash-sales/upcoming/', UpcomingFlashSaleListAPIView.as_view(), name='upcoming_flash_sales'), 
]
