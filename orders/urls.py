from django.urls import path
from .views import (
    OrderListCreateAPIView, 
    OrderRetrieveUpdateDestroyAPIView,
    AdminOrderListAPIView,
    AdminOrderDetailAPIView,
    CouponValidateAPIView,
    AdminCouponListAPIView,
    AdminCouponDetailAPIView
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
]
