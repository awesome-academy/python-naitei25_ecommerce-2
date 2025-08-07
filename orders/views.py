# orders/views.py
from decimal import Decimal
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from cart.models import Cart
from cart.views import calculate_cart_total
from .models import Order, OrderItem
from .serializers import OrderSerializer


class OrderListCreateAPIView(generics.ListCreateAPIView):
    serializer_class       = OrderSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-ordered_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            cart, _ = Cart.objects.select_for_update().get_or_create(user=request.user)
            total = calculate_cart_total(cart.items)
            order = serializer.save(user=request.user, total_amount=total)

            order_items = [
                OrderItem(
                    order=order,
                    product_id=ci["product_id"],
                    quantity=ci["quantity"],
                    price_at_order=Decimal(ci["price"]),
                )
                for ci in cart.items
            ]

            OrderItem.objects.bulk_create(order_items)

            cart.items = []
            cart.save()

        read_serializer = self.get_serializer(order)
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class OrderRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PUT / DELETE /api/orders/<pk>/
    """
    serializer_class       = OrderSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get_queryset(self):
        # ensure users only touch their own orders
        return Order.objects.filter(user=self.request.user)
