from functools import wraps
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


def json_jwt_required(view_func):
    """Decorator kiểm tra JWT auth và trả JSON 403 nếu không hợp lệ"""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        jwt_authenticator = JWTAuthentication()
        try:
            result = jwt_authenticator.authenticate(request)
            if result is None:
                raise AuthenticationFailed("Authentication required")
            request.user = result[0]
        except AuthenticationFailed:
            return JsonResponse(
                {"status": "error", "message": "Authentication required"},
                status=403
            )
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def public_api(view_func):
    """Decorator kết hợp csrf_exempt dành cho các public API"""
    return csrf_exempt(view_func)
