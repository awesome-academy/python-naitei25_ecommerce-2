from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.utils.translation import gettext as _

from products.models import Product
from cart.models import Cart
from .serializers import (
    AddToCartSerializer,
    UpdateCartItemSerializer,
    RemoveFromCartSerializer
)
from core.decorators import json_jwt_required, public_api
from core.constants import CartSettings


def calculate_cart_total(items):
    return sum(float(item['price']) * item['quantity'] for item in items)


class CartBaseView(APIView): 
    authentication_classes = [JWTAuthentication] # Đã sửa lại
    permission_classes = [IsAuthenticated] # Đã sửa lại

    @classmethod
    def as_view(cls, **initkwargs):
        view = super().as_view(**initkwargs)
        return public_api(json_jwt_required(view))


class AddToCartView(CartBaseView):
    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        product_id = data['product_id']
        quantity = data['quantity']

        try:
            product = get_object_or_404(Product, id=product_id) # Đã sửa lại
            
            with transaction.atomic():
                cart, _ = Cart.objects.select_for_update().get_or_create(user=request.user)
                
                item_exists = False
                for item in cart.items:
                    if item['product_id'] == product.id:
                        updated_quantity = item['quantity'] + quantity
                        if updated_quantity > CartSettings.MAX_QUANTITY_PER_ITEM:
                            return Response({
                                "status": "error",
                                "message": _("Total quantity cannot exceed %(max)s") % {
                                    "max": CartSettings.MAX_QUANTITY_PER_ITEM
                                }
                            }, status=status.HTTP_400_BAD_REQUEST)
                        item['quantity'] = updated_quantity
                        item_exists = True
                        break

                if not item_exists:
                    new_item = {
                        "product_id": product.id,
                        "quantity": quantity,
                        "price": str(product.price),
                        "name": product.name,
                        "image": product.first_image_url  # Đã sửa lại
                    }
                    cart.items.append(new_item)

                cart.save()

                return Response({
                    "status": "success",
                    "cart_item_count": len(cart.items),
                    "cart_total": calculate_cart_total(cart.items)
                })

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class GetCartView(CartBaseView):
    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response({
            "status": "success",
            "items": cart.items,
            "total": calculate_cart_total(cart.items)
        })


class GetCartSummaryView(CartBaseView):
    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response({
            "status": "success",
            "cart_item_count": len(cart.items),
            "cart_total": calculate_cart_total(cart.items)
        })


class UpdateCartItemView(CartBaseView):
    def post(self, request):
        serializer = UpdateCartItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        product_id = data['product_id']
        new_quantity = data['quantity']

        try:
            with transaction.atomic():
                cart = Cart.objects.select_for_update().get(user=request.user)
                
                item_updated = False
                for item in cart.items:
                    if item['product_id'] == product_id:
                        item['quantity'] = new_quantity
                        item_updated = True
                        break

                if not item_updated:
                    return Response({
                        "status": "error",
                        "message": _("Product not found in cart")
                    }, status=status.HTTP_404_NOT_FOUND)

                cart.save()

                return Response({
                    "status": "success",
                    "cart_item_count": len(cart.items),
                    "cart_total": calculate_cart_total(cart.items)
                })

        except Cart.DoesNotExist:
            return Response({
                "status": "error",
                "message": _("Cart not found")
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class RemoveFromCartView(CartBaseView):
    def post(self, request):
     
        serializer = RemoveFromCartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        product_id = serializer.validated_data['product_id']

        try:
            with transaction.atomic():
                cart = Cart.objects.select_for_update().get(user=request.user)
                initial_count = len(cart.items)
                
                cart.items = [item for item in cart.items if item['product_id'] != product_id]
                
                if len(cart.items) == initial_count:
                    return Response({
                        "status": "error",
                        "message": _("Product not found in cart")
                    }, status=status.HTTP_404_NOT_FOUND)

                cart.save()

                return Response({
                    "status": "success",
                    "cart_item_count": len(cart.items),
                    "cart_total": calculate_cart_total(cart.items),
                    "message": _("Product removed from cart")
                })

        except Cart.DoesNotExist:
            return Response({
                "status": "error",
                "message": _("Cart not found")
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class ClearCartView(CartBaseView):
    def post(self, request):
        try:
            with transaction.atomic():
                cart = Cart.objects.select_for_update().get(user=request.user)

                if not cart.items:
                    return Response({
                        "status": "error",
                        "message": _("Cart is already empty")
                    }, status=status.HTTP_400_BAD_REQUEST)

                cart.items = []  # Xóa hết item
                cart.save()

                return Response({
                    "status": "success",
                    "message": _("Cart has been cleared"),
                    "cart_item_count": 0,
                    "cart_total": 0
                })

        except Cart.DoesNotExist:
            return Response({
                "status": "error",
                "message": _("Cart not found")
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
