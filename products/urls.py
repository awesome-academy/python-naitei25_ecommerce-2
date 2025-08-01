"""Products app URL configuration."""
from __future__ import annotations

from django.urls import path

from products import views
from products.api_docs import APIDocumentationView

app_name = 'products'

urlpatterns = [
    path(
        'api/products/', views.ProductListAPIView.as_view(),
        name='api_product_list',
    ),
    path(
        'api/products/<int:pk>/', views.ProductDetailAPIView.as_view(),
        name='api_product_detail',
    ),
    path(
        'api/categories/', views.CategoryListAPIView.as_view(),
        name='api_category_list',
    ),

    # API documentation
    path('api/docs/', APIDocumentationView.as_view(), name='api_docs'),
]
