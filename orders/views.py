# orders/views.py

from decimal import Decimal
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAdminUser
from django.utils.translation import gettext as _

from cart.models import Cart
from cart.views import calculate_cart_total
from .models import Order, OrderItem, Coupon
from .serializers import OrderSerializer, CouponApplySerializer, CouponSerializer
from core.constants import OrderStatus, CancelReason


class OrderListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-ordered_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            cart, _ = Cart.objects.select_for_update().get_or_create(user=request.user)
            total = calculate_cart_total(cart.items)
            
            # Apply coupon if provided
            coupon_code = request.data.get('coupon_code')
            discount_amount = 0
            coupon = None
            
            if coupon_code:
                coupon_serializer = CouponApplySerializer(data={
                    'code': coupon_code,
                    'total_amount': total
                })
                
                if coupon_serializer.is_valid():
                    coupon = coupon_serializer.validated_data['code']
                    final_amount, discount_amount = coupon.apply_discount(total)
                    
                    # Update coupon usage
                    coupon.times_used += 1
                    coupon.save()
                else:
                    return Response(
                        {'coupon_code': coupon_serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                final_amount = total

            order = serializer.save(
                user=request.user,
                total_amount=total,
                discount_amount=discount_amount,
                final_amount=final_amount,
                coupon=coupon
            )

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


class CouponValidateAPIView(generics.GenericAPIView):
    """Validate coupon and calculate discount"""
    serializer_class = CouponApplySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            coupon = serializer.validated_data['code']
            total_amount = serializer.validated_data.get('total_amount', 0)
            
            final_amount, discount_amount = coupon.apply_discount(total_amount)
            
            return Response({
                'valid': True,
                'coupon': CouponSerializer(coupon).data,
                'discount_amount': discount_amount,
                'final_amount': final_amount
            })
        
        return Response({
            'valid': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class AdminCouponListAPIView(generics.ListCreateAPIView):
    """Admin view to list and create coupons"""
    serializer_class = CouponSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Coupon.objects.all().order_by('-created_at')


class AdminCouponDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Admin view to manage individual coupons"""
    serializer_class = CouponSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Coupon.objects.all()


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

class AdminOrderListAPIView(generics.ListAPIView):
    """Admin view to list all orders"""
    serializer_class = OrderSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Order.objects.all().order_by("-ordered_at")

class AdminOrderDetailAPIView(generics.RetrieveUpdateAPIView):
    """Admin view to retrieve/update order details"""
    serializer_class = OrderSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Order.objects.all()

    def update(self, request, *args, **kwargs):
        # Admin có thể cập nhật bất kỳ trạng thái nào
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
