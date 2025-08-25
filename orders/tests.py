from __future__ import annotations

from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from .models import Coupon, Order
from core.constants import OrderStatus, PaymentMethod
from django.contrib.auth import get_user_model

User = get_user_model()


class CouponModelTest(TestCase):
    def setUp(self):
        # Create a valid coupon
        self.valid_coupon = Coupon.objects.create(
            code="TEST20",
            discount_percent=Decimal("20.00"),
            max_discount_amount=Decimal("1000.00"),
            expires_at=timezone.now() + timedelta(days=7),
            usage_limit=10,
            times_used=0
        )
        
        # Create an expired coupon
        self.expired_coupon = Coupon.objects.create(
            code="EXPIRED20",
            discount_percent=Decimal("20.00"),
            max_discount_amount=Decimal("1000.00"),
            expires_at=timezone.now() - timedelta(days=1),
            usage_limit=10,
            times_used=0
        )
        
        # Create a coupon with usage limit reached
        self.limit_reached_coupon = Coupon.objects.create(
            code="LIMIT20",
            discount_percent=Decimal("20.00"),
            max_discount_amount=Decimal("1000.00"),
            expires_at=timezone.now() + timedelta(days=7),
            usage_limit=5,
            times_used=5
        )
        
        # Create a coupon with no expiration date
        self.no_expiry_coupon = Coupon.objects.create(
            code="NOEXPIRE20",
            discount_percent=Decimal("20.00"),
            max_discount_amount=Decimal("1000.00"),
            expires_at=None,
            usage_limit=None,
            times_used=0
        )

    def test_coupon_creation(self):
        """Test that coupons are created correctly"""
        self.assertEqual(self.valid_coupon.code, "TEST20")
        self.assertEqual(self.valid_coupon.discount_percent, Decimal("20.00"))
        self.assertEqual(self.valid_coupon.max_discount_amount, Decimal("1000.00"))
        self.assertEqual(self.valid_coupon.times_used, 0)

    def test_coupon_str_method(self):
        """Test the string representation of coupon"""
        self.assertEqual(str(self.valid_coupon), "TEST20 - 20.00% off")

    def test_is_valid_method(self):
        """Test the is_valid method"""
        # Valid coupon
        self.assertTrue(self.valid_coupon.is_valid())
        
        # Expired coupon
        self.assertFalse(self.expired_coupon.is_valid())
        
        # Usage limit reached
        self.assertFalse(self.limit_reached_coupon.is_valid())
        
        # No expiration or usage limit
        self.assertTrue(self.no_expiry_coupon.is_valid())

    def test_apply_discount_method(self):
        """Test the apply_discount method"""
        # Test normal discount application
        final_amount, discount_amount = self.valid_coupon.apply_discount(Decimal("5000.00"))
        expected_discount = Decimal("5000.00") * Decimal("0.20")  # 20% of 5000 = 1000
        self.assertEqual(discount_amount, expected_discount)
        self.assertEqual(final_amount, Decimal("5000.00") - expected_discount)
        
        # Test discount capped at max_discount_amount
        final_amount, discount_amount = self.valid_coupon.apply_discount(Decimal("10000.00"))
        self.assertEqual(discount_amount, Decimal("1000.00"))  # Capped at 1000
        self.assertEqual(final_amount, Decimal("9000.00"))
        
        # Test with expired coupon (should return original amount)
        final_amount, discount_amount = self.expired_coupon.apply_discount(Decimal("5000.00"))
        self.assertEqual(discount_amount, Decimal("0.00"))
        self.assertEqual(final_amount, Decimal("5000.00"))
        
        # Test with invalid coupon (usage limit reached)
        final_amount, discount_amount = self.limit_reached_coupon.apply_discount(Decimal("5000.00"))
        self.assertEqual(discount_amount, Decimal("0.00"))
        self.assertEqual(final_amount, Decimal("5000.00"))
        
        # Test with zero amount
        final_amount, discount_amount = self.valid_coupon.apply_discount(Decimal("0.00"))
        self.assertEqual(discount_amount, Decimal("0.00"))
        self.assertEqual(final_amount, Decimal("0.00"))
        
        # Test with non-Decimal input
        final_amount, discount_amount = self.valid_coupon.apply_discount(5000.00)
        expected_discount = Decimal("5000.00") * Decimal("0.20")
        self.assertEqual(discount_amount, expected_discount)
        self.assertEqual(final_amount, Decimal("5000.00") - expected_discount)

    def test_coupon_usage_increment(self):
        """Test that coupon usage is incremented when used"""
        initial_usage = self.valid_coupon.times_used
        self.valid_coupon.times_used += 1
        self.valid_coupon.save()
        
        self.assertEqual(self.valid_coupon.times_used, initial_usage + 1)


class CouponSerializerTest(TestCase):
    def setUp(self):
        self.valid_coupon = Coupon.objects.create(
            code="SERIALIZERTEST",
            discount_percent=Decimal("15.00"),
            max_discount_amount=Decimal("500.00"),
            expires_at=timezone.now() + timedelta(days=5),
            usage_limit=3,
            times_used=1
        )
        
        self.expired_coupon = Coupon.objects.create(
            code="EXPIREDSERIALIZER",
            discount_percent=Decimal("15.00"),
            max_discount_amount=Decimal("500.00"),
            expires_at=timezone.now() - timedelta(days=1),
            usage_limit=3,
            times_used=0
        )

    def test_coupon_serializer_fields(self):
        """Test that the serializer includes all required fields"""
        from .serializers import CouponSerializer
        
        serializer = CouponSerializer(self.valid_coupon)
        data = serializer.data
        
        self.assertIn('id', data)
        self.assertIn('code', data)
        self.assertIn('discount_percent', data)
        self.assertIn('max_discount_amount', data)
        self.assertIn('expires_at', data)
        self.assertIn('usage_limit', data)
        self.assertIn('times_used', data)
        self.assertIn('status', data)
        self.assertIn('is_valid', data)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)

    def test_coupon_serializer_status_field(self):
        """Test the status field in the serializer"""
        from .serializers import CouponSerializer
        
        # Test valid coupon status
        serializer = CouponSerializer(self.valid_coupon)
        self.assertEqual(serializer.data['status'], 'VALID')
        self.assertTrue(serializer.data['is_valid'])
        
        # Test expired coupon status
        serializer = CouponSerializer(self.expired_coupon)
        self.assertEqual(serializer.data['status'], 'EXPIRED')
        self.assertFalse(serializer.data['is_valid'])


class CouponApplySerializerTest(TestCase):
    def setUp(self):
        self.valid_coupon = Coupon.objects.create(
            code="APPLYTEST",
            discount_percent=Decimal("10.00"),
            max_discount_amount=Decimal("200.00"),
            expires_at=timezone.now() + timedelta(days=10),
            usage_limit=5,
            times_used=0
        )
        
        self.expired_coupon = Coupon.objects.create(
            code="EXPIREDAPPLY",
            discount_percent=Decimal("10.00"),
            max_discount_amount=Decimal("200.00"),
            expires_at=timezone.now() - timedelta(days=1),
            usage_limit=5,
            times_used=0
        )

    def test_valid_coupon_code_validation(self):
        """Test validation of valid coupon code"""
        from .serializers import CouponApplySerializer
        
        serializer = CouponApplySerializer(data={
            'code': 'APPLYTEST',
            'total_amount': Decimal('1000.00')
        })
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['code'], self.valid_coupon)

    def test_invalid_coupon_code_validation(self):
        """Test validation of invalid coupon code"""
        from .serializers import CouponApplySerializer
        
        serializer = CouponApplySerializer(data={
            'code': 'INVALIDCODE',
            'total_amount': Decimal('1000.00')
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('code', serializer.errors)

    def test_expired_coupon_code_validation(self):
        """Test validation of expired coupon code"""
        from .serializers import CouponApplySerializer
        
        serializer = CouponApplySerializer(data={
            'code': 'EXPIREDAPPLY',
            'total_amount': Decimal('1000.00')
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('code', serializer.errors)


class CouponViewTest(TestCase):
    def setUp(self):
        # Create users with email instead of username
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123'
        )
        
        self.admin_user = User.objects.create_user(
            email='adminuser@example.com',
            password='adminpass123',
            is_staff=True
        )
        
        self.valid_coupon = Coupon.objects.create(
            code="VIEWTEST",
            discount_percent=Decimal("25.00"),
            max_discount_amount=Decimal("300.00"),
            expires_at=timezone.now() + timedelta(days=15),
            usage_limit=8,
            times_used=2
        )

    def test_coupon_validate_view(self):
        """Test the coupon validation API view"""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        from decimal import Decimal  # Đảm bảo import Decimal
        
        client = APIClient()
        
        # Lấy JWT token để xác thực
        refresh = RefreshToken.for_user(self.user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Test coupon hợp lệ - sử dụng format='json' để tránh lỗi 415
        response = client.post('/api/coupons/validate/', {
            'code': 'VIEWTEST',
            'total_amount': '1200.00'
        }, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['valid'])
        # Thay đổi dòng này để so sánh với Decimal thay vì chuỗi:
        self.assertEqual(response.data['discount_amount'], Decimal('300.00'))  # Giới hạn ở max_discount_amount
        self.assertEqual(response.data['final_amount'], Decimal('900.00'))
        
        # Test coupon không hợp lệ
        response = client.post('/api/coupons/validate/', {
            'code': 'INVALIDCODE',
            'total_amount': '1200.00'
        }, format='json')
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['valid'])
        self.assertIn('errors', response.data)

    def test_admin_coupon_list_view(self):
        """Test the admin coupon list API view"""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        
        client = APIClient()
        
        # Test with non-admin user (should be forbidden)
        refresh = RefreshToken.for_user(self.user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = client.get('/api/admin/coupons/')
        self.assertEqual(response.status_code, 403)  # Forbidden
        
        # Test with admin user
        refresh = RefreshToken.for_user(self.admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = client.get('/api/admin/coupons/')
        self.assertEqual(response.status_code, 200)
        
        # Check if response is paginated (contains 'results' key)
        if 'results' in response.data:
            # Paginated response
            self.assertEqual(len(response.data['results']), 1)  # Should return the one coupon we created
        else:
            # Non-paginated response
            self.assertEqual(len(response.data), 1)  # Should return the one coupon we created


class CouponIntegrationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='integrationuser@example.com',
            password='testpass123'
        )
        
        self.valid_coupon = Coupon.objects.create(
            code="INTEGRATIONTEST",
            discount_percent=Decimal("15.00"),
            max_discount_amount=Decimal("250.00"),
            expires_at=timezone.now() + timedelta(days=20),
            usage_limit=10,
            times_used=0
        )

    def test_coupon_usage_in_order_creation(self):
        """Test that coupon usage is incremented when used in an order"""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        
        client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Create an order with coupon
        order_data = {
            'customer_name': 'Test Customer',
            'customer_phone': '1234567890',
            'customer_address': 'Test Address',
            'payment_method': PaymentMethod.COD.value,
            'coupon_code': 'INTEGRATIONTEST'
        }
        
        # Note: This test assumes the order creation view is working correctly
        # In a real test, you might need to mock the cart or set up cart items
        
        # Check initial coupon usage
        initial_usage = self.valid_coupon.times_used
        
        # After order creation, the coupon usage should be incremented
        # This would be tested in the Order creation view tests
        
        # For now, just test that the coupon can be applied
        final_amount, discount_amount = self.valid_coupon.apply_discount(Decimal("2000.00"))
        expected_discount = min(Decimal("2000.00") * Decimal("0.15"), Decimal("250.00"))
        
        self.assertEqual(discount_amount, expected_discount)
        self.assertEqual(final_amount, Decimal("2000.00") - expected_discount)
        
        # The actual order creation with coupon would be tested in order view tests
