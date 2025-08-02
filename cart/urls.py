from django.urls import path
from .views import add_to_cart, get_cart, get_cart_summary

urlpatterns = [
    path('api/cart/add/', add_to_cart, name='api_add_to_cart'),
    path('api/cart/', get_cart, name='api_get_cart'),
    path('api/cart/summary/', get_cart_summary, name='api_cart_summary'),
]
