from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from functools import wraps
from products.models import Product
from cart.models import Cart
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt 
def json_jwt_required(view_func):
    """Decorator that checks for JWT token in Authorization header and returns 403 JSON if invalid."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        jwt_authenticator = JWTAuthentication()
        try:
            result = jwt_authenticator.authenticate(request)
            if result is None:
                raise AuthenticationFailed("Authentication required")

            user, validated_token = result
            request.user = user
        except AuthenticationFailed:
            return JsonResponse(
                {"status": "error", "message": "Authentication required"},
                status=403
            )

        return view_func(request, *args, **kwargs)
    return _wrapped_view


def calculate_cart_total(items):
    return sum(float(item['price']) * item['quantity'] for item in items)


@csrf_exempt 
@require_http_methods(["POST"])
@json_jwt_required
def add_to_cart(request):
    """Thêm sản phẩm vào giỏ hàng (chỉ cho người đã đăng nhập)"""
    try:
        product_id = request.POST.get('product_id')
        quantity = int(request.POST.get('quantity', 1))

        if not product_id or quantity <= 0:
            raise ValueError("Invalid product or quantity")

        product = Product.objects.get(id=product_id)

        new_item = {
            "product_id": product.id,
            "quantity": quantity,
            "price": str(product.price),
            "name": product.name,
            "image": product.image.url if hasattr(product, 'image') and product.image else None
        }

        cart, _ = Cart.objects.get_or_create(user=request.user)

        item_exists = False
        for item in cart.items:
            if item['product_id'] == new_item['product_id']:
                item['quantity'] += new_item['quantity']
                item_exists = True
                break

        if not item_exists:
            cart.items.append(new_item)

        cart.save()

        return JsonResponse({
            "status": "success",
            "cart_item_count": len(cart.items),
            "cart_total": calculate_cart_total(cart.items)
        })

    except Product.DoesNotExist:
        return JsonResponse({
            "status": "error",
            "message": "Product not found"
        }, status=404)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=400)


@csrf_exempt 
@json_jwt_required
def get_cart(request):
    """Lấy thông tin giỏ hàng chi tiết (chỉ cho authenticated users)"""
    cart, _ = Cart.objects.get_or_create(user=request.user)
    return JsonResponse({
        "items": cart.items,
        "total": calculate_cart_total(cart.items)
    })


@csrf_exempt 
@json_jwt_required
def get_cart_summary(request):
    """Lấy thông tin tóm tắt giỏ hàng (chỉ cho người đã đăng nhập)"""
    cart, _ = Cart.objects.get_or_create(user=request.user)
    items = cart.items
    return JsonResponse({
        "cart_item_count": len(items),
        "cart_total": calculate_cart_total(items)
    })
