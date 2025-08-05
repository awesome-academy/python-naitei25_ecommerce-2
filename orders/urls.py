from django.urls import path
from .views import OrderListCreateAPIView, OrderRetrieveUpdateDestroyAPIView

app_name = 'orders'

urlpatterns = [
    path('api/orders/', OrderListCreateAPIView.as_view(), name='api_order_list_create'),
    path('api/orders/<int:pk>/', OrderRetrieveUpdateDestroyAPIView.as_view(), name='api_order_detail'),
]