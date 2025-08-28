"""Views for products app."""
from __future__ import annotations

from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.utils.translation import gettext_lazy as _
from rest_framework import filters
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser



from products.models import Category, Product
from orders.models import OrderItem
from cart.models import Cart
from products.serializers import (
    AdminProductSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductInstantSerializer
)

class CategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.all().order_by('name')


@method_decorator(csrf_exempt, name='dispatch')
class AdminProductListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminProductSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.SearchFilter]  
    search_fields = ['name', 'description']

    def get_queryset(self):
        qs = Product.objects.select_related('category').all()

        category_id = self.request.query_params.get('category')
        if category_id and category_id != "all":
            try:
                qs = qs.filter(category_id=int(category_id))
            except (ValueError, TypeError):
                pass

        is_in_stock = (self.request.query_params.get('is_in_stock') or "").lower()
        if is_in_stock in {"true", "1", "false", "0"}:
            qs = qs.filter(is_in_stock=is_in_stock in {"true", "1"})

        allowed_orderings = {
            'name', '-name', 'price', '-price',
            'created_at', '-created_at', 'updated_at', '-updated_at',
        }
        ordering = self.request.query_params.get('ordering')
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-created_at')

        return qs

@method_decorator(csrf_exempt, name='dispatch')
class AdminProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = AdminProductSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Product.objects.filter(is_deleted=False)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if OrderItem.objects.filter(product=instance).exists():
            instance.soft_delete()
            return Response(
                {
                    "detail": _("Product has been marked as deleted since it exists in orders."),
                    "is_soft_deleted": True
                },
                status=status.HTTP_200_OK
            )
            
        if Cart.objects.filter(items__contains=[{"product_id": instance.id}]).exists():
            instance.soft_delete()
            return Response(
                {
                    "detail": _("Product has been marked as deleted since it exists in shopping carts."),
                    "is_soft_deleted": True
                },
                status=status.HTTP_200_OK
            )
            
        self.perform_destroy(instance)
        return Response(
            {
                "detail": _("Product has been permanently deleted."),
                "is_soft_deleted": False
            },
            status=status.HTTP_204_NO_CONTENT
        )


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
        ).filter(is_in_stock=True, is_deleted=False)

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

    def get_queryset(self):
        return Product.objects.select_related('category').filter(is_deleted=False)


class InstantProductSearchAPIView(generics.ListAPIView):
    serializer_class = ProductInstantSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        q = (self.request.query_params.get("q") or "").strip()
        if not q:
            return Product.objects.none()

        vector = (
            SearchVector("name", weight="A", config="simple") +
            SearchVector("description", weight="B", config="simple")
        )
        query = SearchQuery(q, config="simple")

        return (
            Product.objects.filter(is_in_stock=True, is_deleted=False)
            .annotate(rank=SearchRank(vector, query))
            .filter(rank__gt=0)
            .order_by("-rank", "-id")  
        )

    def list(self, request, *args, **kwargs):
       
        try:
            limit = min(int(request.query_params.get("limit", 10)), 20)
        except (TypeError, ValueError):
            limit = 10

        queryset = self.get_queryset()[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response({"results": serializer.data})
