# orders/views.py
from decimal import Decimal
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils.translation import gettext as _

from cart.models import Cart
from cart.views import calculate_cart_total
from .models import Order, OrderItem
from .serializers import OrderSerializer
from core.constants import OrderStatus, CancelReason


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
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Define allowed statuses for user cancellation
        cancellable_statuses = [
            OrderStatus.PENDING.value,
        ]
        
        # Check if user is trying to cancel the order
        if not request.user.is_staff:

            # User chỉ được phép hủy đơn, không được phép thay đổi trạng thái khác
            if 'order_status' in request.data and request.data['order_status'] != OrderStatus.CANCELLED.value:
                return Response(
                    {'detail': _('You can only cancel orders, not change to other statuses.')},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            cancel_reason = request.data.get('cancel_reason')
            
            # Nếu không có lý do hủy -> 400
            if not cancel_reason:
                return Response(
                    {'cancel_reason': _('This field is required.')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Nếu có lý do nhưng trạng thái không được phép -> 403
            if instance.order_status not in cancellable_statuses:
                return Response(
                    {'detail': _('This order cannot be cancelled.')},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Nếu hợp lệ thì cho hủy
            serializer = self.get_serializer(
                instance,
                data={'order_status': OrderStatus.CANCELLED.value, 'cancel_reason': cancel_reason},
                partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        # --- Admin xử lý các update khác ---
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
