"""Views for products app."""
from __future__ import annotations

from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions

from products.models import Category
from products.models import Product
from products.serializers import CategorySerializer
from products.serializers import ProductDetailSerializer
from products.serializers import ProductListSerializer

class CategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.all().order_by('name')


@method_decorator(csrf_exempt, name='dispatch')
class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAdminUser]

@method_decorator(csrf_exempt, name='dispatch')
class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAdminUser]

class ProductListAPIView(generics.ListAPIView):
    serializer_class = ProductListSerializer

    def get_queryset(self):
        queryset = Product.objects.select_related(
            'category',
        ).filter(is_in_stock=True)

        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            try:
                queryset = queryset.filter(category_id=int(category_id))
            except (ValueError, TypeError):
                pass

        # Search by name or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search),
            )

        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')

        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except (ValueError, TypeError):
                pass

        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        # Order by
        ordering = self.request.query_params.get('ordering', '-created_at')
        valid_orderings = [
            'name', '-name', 'price',
            '-price', 'created_at', '-created_at',
        ]
        if ordering in valid_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset


class ProductDetailAPIView(generics.RetrieveAPIView):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductDetailSerializer
    lookup_field = 'pk'
