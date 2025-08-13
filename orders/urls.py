from django.urls import path
from .views import (
    OrderListCreateAPIView, 
    OrderRetrieveUpdateDestroyAPIView,
    AdminOrderListAPIView,
    AdminOrderDetailAPIView
)

app_name = 'orders'

urlpatterns = [
    path('api/orders/', OrderListCreateAPIView.as_view(), name='api_order_list_create'),
    path('api/orders/<int:pk>/', OrderRetrieveUpdateDestroyAPIView.as_view(), name='api_order_detail'),
    path('api/admin/orders/', AdminOrderListAPIView.as_view(), name='admin_order_list'),
    path('api/admin/orders/<int:pk>/', AdminOrderDetailAPIView.as_view(), name='admin_order_detail'),
]
