from django.urls import path
from .views import (
    AddToCartView,      
    GetCartView,        
    GetCartSummaryView,   
    UpdateCartItemView, 
    RemoveFromCartView,
    ClearCartView    
)

urlpatterns = [
    path('api/cart/add/', AddToCartView.as_view(), name='api_add_to_cart'),
    path('api/cart/', GetCartView.as_view(), name='api_get_cart'),
    path('api/cart/summary/', GetCartSummaryView.as_view(), name='api_get_cart_summary'), 
    path('api/cart/update/', UpdateCartItemView.as_view(), name='api_update_cart_item'),
    path('api/cart/remove/', RemoveFromCartView.as_view(), name='api_remove_from_cart'),
    path('api/cart/clear/', ClearCartView.as_view(), name='api_clear_cart'),
]
