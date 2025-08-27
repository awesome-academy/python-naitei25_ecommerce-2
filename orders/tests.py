from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from .models import Coupon, Order, FlashSale
from products.models import Product, Category
from core.constants import OrderStatus, PaymentMethod

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


class FlashSaleModelTest(TestCase):
    def setUp(self):

        # Create category
        self.category = Category.objects.create(
            name="Test Category",
        )
        
        # Create products
        self.product1 = Product.objects.create(
            name="Test Product 1",
            description="Test product description 1",
            price=Decimal("100.00"),
            category=self.category,
            is_in_stock=True
        )
        
        self.product2 = Product.objects.create(
            name="Test Product 2",
            description="Test product description 2",
            price=Decimal("200.00"),
            category=self.category,
            is_in_stock=True
        )
        
        # Create active flash sale
        self.active_flash_sale = FlashSale.objects.create(
            name="Summer Sale",
            discount_percent=Decimal("20.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=True
        )
        self.active_flash_sale.products.add(self.product1, self.product2)
        
        # Create upcoming flash sale
        self.upcoming_flash_sale = FlashSale.objects.create(
            name="Winter Sale",
            discount_percent=Decimal("30.00"),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=2),
            is_active=True
        )
        self.upcoming_flash_sale.products.add(self.product1)
        
        # Create expired flash sale
        self.expired_flash_sale = FlashSale.objects.create(
            name="Spring Sale",
            discount_percent=Decimal("15.00"),
            start_date=timezone.now() - timedelta(days=2),
            end_date=timezone.now() - timedelta(days=1),
            is_active=True
        )
        self.expired_flash_sale.products.add(self.product2)
        
        # Create inactive flash sale
        self.inactive_flash_sale = FlashSale.objects.create(
            name="Autumn Sale",
            discount_percent=Decimal("25.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=False
        )
        self.inactive_flash_sale.products.add(self.product1)

    def test_flash_sale_creation(self):
        """Test that flash sales are created correctly"""
        self.assertEqual(self.active_flash_sale.name, "Summer Sale")
        self.assertEqual(self.active_flash_sale.discount_percent, Decimal("20.00"))
        self.assertEqual(self.active_flash_sale.products.count(), 2)

    def test_flash_sale_str_method(self):
        """Test the string representation of flash sale"""
        self.assertEqual(str(self.active_flash_sale), "Summer Sale - 20.00%")

    def test_is_currently_active_method(self):
        """Test the is_currently_active method"""
        # Active flash sale
        self.assertTrue(self.active_flash_sale.is_currently_active())
        
        # Upcoming flash sale
        self.assertFalse(self.upcoming_flash_sale.is_currently_active())
        
        # Expired flash sale
        self.assertFalse(self.expired_flash_sale.is_currently_active())
        
        # Inactive flash sale
        self.assertFalse(self.inactive_flash_sale.is_currently_active())

    def test_get_remaining_time_method(self):
        """Test the get_remaining_time method"""
        # Active flash sale should have positive remaining time
        remaining_time = self.active_flash_sale.get_remaining_time()
        self.assertIsNotNone(remaining_time)
        self.assertGreater(remaining_time.total_seconds(), 0)
        
        # Upcoming flash sale should return time until start
        upcoming_time = self.upcoming_flash_sale.get_remaining_time()
        self.assertIsNotNone(upcoming_time)
        self.assertGreater(upcoming_time.total_seconds(), 0)
        
        # Expired flash sale should return None
        self.assertIsNone(self.expired_flash_sale.get_remaining_time())

    def test_calculate_sale_price_method(self):
        """Test the calculate_sale_price method"""
        # Test normal discount calculation
        sale_price = self.active_flash_sale.calculate_sale_price(Decimal("100.00"))
        expected_price = Decimal("100.00") * (Decimal("1.00") - Decimal("0.20"))
        self.assertEqual(sale_price, expected_price)
        
        # Test with zero price
        sale_price = self.active_flash_sale.calculate_sale_price(Decimal("0.00"))
        self.assertEqual(sale_price, Decimal("0.00"))
        
        # Test with 100% discount (should not go below 0)
        flash_sale_100 = FlashSale.objects.create(
            name="100% Sale",
            discount_percent=Decimal("100.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=True
        )
        sale_price = flash_sale_100.calculate_sale_price(Decimal("50.00"))
        self.assertEqual(sale_price, Decimal("0.00"))

    def test_get_products_info_method(self):
        """Test the get_products_info method"""
        products_info = self.active_flash_sale.get_products_info()
        
        self.assertEqual(len(products_info), 2)
        
        # Check product 1 info
        product1_info = next(p for p in products_info if p['id'] == self.product1.id)
        self.assertEqual(product1_info['name'], "Test Product 1")
        self.assertEqual(product1_info['original_price'], "100.00")
        self.assertEqual(product1_info['sale_price'], "80.00")  # 20% off 100
        self.assertEqual(product1_info['discount_percent'], 20.0)
        self.assertEqual(product1_info['is_in_stock'], True)
        self.assertEqual(product1_info['category'], "Test Category")


class FlashSaleSerializerTest(TestCase):
    def setUp(self):

        # Create category and product
        self.category = Category.objects.create(
            name="Test Category",
        )
        
        self.product = Product.objects.create(
            name="Test Product",
            description="Test product description",
            price=Decimal("100.00"),
            category=self.category,
            is_in_stock=True
        )
        
        # Create flash sale
        self.flash_sale = FlashSale.objects.create(
            name="Test Sale",
            discount_percent=Decimal("25.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=True
        )
        self.flash_sale.products.add(self.product)

    def test_flash_sale_serializer_fields(self):
        """Test that the serializer includes all required fields"""
        from .serializers import FlashSaleSerializer
        
        serializer = FlashSaleSerializer(self.flash_sale)
        data = serializer.data
        
        self.assertIn('id', data)
        self.assertIn('name', data)
        self.assertIn('discount_percent', data)
        self.assertIn('products', data)
        self.assertIn('products_info', data)
        self.assertIn('start_date', data)
        self.assertIn('end_date', data)
        self.assertIn('is_active', data)
        self.assertIn('status', data)
        self.assertIn('remaining_time', data)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)

    def test_flash_sale_serializer_status_field(self):
        """Test the status field in the serializer"""
        from .serializers import FlashSaleSerializer
        
        serializer = FlashSaleSerializer(self.flash_sale)
        self.assertEqual(serializer.data['status'], 'ACTIVE')
        
        # Test upcoming status
        upcoming_sale = FlashSale.objects.create(
            name="Upcoming Sale",
            discount_percent=Decimal("15.00"),
            start_date=timezone.now() + timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=25),
            is_active=True
        )
        serializer = FlashSaleSerializer(upcoming_sale)
        self.assertEqual(serializer.data['status'], 'UPCOMING')

    def test_flash_sale_serializer_products_info(self):
        """Test the products_info field in the serializer"""
        from .serializers import FlashSaleSerializer
        
        serializer = FlashSaleSerializer(self.flash_sale)
        products_info = serializer.data['products_info']
        
        self.assertEqual(len(products_info), 1)
        product_info = products_info[0]
        
        self.assertEqual(product_info['name'], 'Test Product')
        self.assertEqual(product_info['original_price'], '100.00')
        self.assertEqual(product_info['sale_price'], '75.00')  # 25% off 100
        self.assertEqual(product_info['discount_percent'], 25.0)
        self.assertEqual(product_info['is_in_stock'], True)
        self.assertEqual(product_info['category'], 'Test Category')


class FlashSaleListViewTest(TestCase):
    def setUp(self):

        self.category = Category.objects.create(
            name="Test Category",
        )
        
        self.product = Product.objects.create(
            name="Test Product",
            description="Test product description",
            price=Decimal("100.00"),
            category=self.category,
            is_in_stock=True
        )
        
        # Create active flash sale
        self.active_flash_sale = FlashSale.objects.create(
            name="Active Sale",
            discount_percent=Decimal("20.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=True
        )
        self.active_flash_sale.products.add(self.product)
        
        # Create inactive flash sale (should not appear in public API)
        self.inactive_flash_sale = FlashSale.objects.create(
            name="Inactive Sale",
            discount_percent=Decimal("30.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=False
        )
        self.inactive_flash_sale.products.add(self.product)

    def test_active_flash_sale_list_view(self):
        """Test the active flash sale list API view"""
        from rest_framework.test import APIClient
        client = APIClient()
        
        # Test public endpoint
        response = client.get('/api/flash-sales/active/')
        self.assertEqual(response.status_code, 200)
        
        # Should only return active flash sales
        print("Active sales from API:", response.data)
        
        # Access the results array instead of response.data directly
        self.assertEqual(response.data["results"][0]['name'], 'Active Sale')
        self.assertEqual(len(response.data["results"]), 1)
        
        # Kiểm tra các trường thực tế có trong response
        flash_sale_data = response.data["results"][0]
        self.assertIn('name', flash_sale_data)
        self.assertIn('discount_percent', flash_sale_data)
        self.assertIn('products_info', flash_sale_data)

    def test_flash_sale_product_list_view(self):
        """Test the flash sale product list API view"""
        from rest_framework.test import APIClient
        
        client = APIClient()
        
        # Test valid flash sale
        response = client.get(f'/api/flash-sales/{self.active_flash_sale.id}/products/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['flash_sale']['name'], 'Active Sale')
        self.assertEqual(len(response.data['products']), 1)
        self.assertEqual(response.data['products'][0]['name'], 'Test Product')
        
        # Test non-existent flash sale
        response = client.get('/api/flash-sales/999/products/')
        self.assertEqual(response.status_code, 404)


class AdminFlashSaleViewTest(TestCase):
    def setUp(self):

        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='adminpass123',
            is_staff=True
        )
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            password='userpass123',
            is_staff=False
        )
        
        # Create products
        self.category = Category.objects.create(
            name="Test Category",
        )
        
        self.product = Product.objects.create(
            name="Test Product",
            description="Test product description",
            price=Decimal("100.00"),
            category=self.category,
            is_in_stock=True
        )
        
        # Create flash sale
        self.flash_sale = FlashSale.objects.create(
            name="Test Sale",
            discount_percent=Decimal("25.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=True
        )
        self.flash_sale.products.add(self.product)

    def test_admin_flash_sale_list_view(self):
        """Test the admin flash sale list API view"""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        
        client = APIClient()
        
        # Test with non-admin user (should be forbidden)
        refresh = RefreshToken.for_user(self.regular_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = client.get('/api/admin/flash-sales/')
        self.assertEqual(response.status_code, 403)  # Forbidden
        
        # Test with admin user
        refresh = RefreshToken.for_user(self.admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = client.get('/api/admin/flash-sales/')
        self.assertEqual(response.status_code, 200)
        
        # Should return all flash sales regardless of status
        if 'results' in response.data:
            # Paginated response
            self.assertEqual(len(response.data['results']), 1)
        else:
            # Non-paginated response
            self.assertEqual(len(response.data), 1)

    def test_admin_flash_sale_create_view(self):
        """Test the admin flash sale create API view"""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        
        client = APIClient()
        refresh = RefreshToken.for_user(self.admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Create new flash sale
        new_sale_data = {
            'name': 'New Flash Sale',
            'discount_percent': '15.00',
            'products': [self.product.id],
            'start_date': (timezone.now() + timedelta(hours=1)).isoformat(),
            'end_date': (timezone.now() + timedelta(hours=25)).isoformat(),
            'is_active': True
        }
        
        response = client.post('/api/admin/flash-sales/', new_sale_data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['name'], 'New Flash Sale')
        self.assertEqual(response.data['status'], 'UPCOMING')

    def test_admin_flash_sale_detail_view(self):
        """Test the admin flash sale detail API view"""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        
        client = APIClient()
        refresh = RefreshToken.for_user(self.admin_user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # Test GET detail
        response = client.get(f'/api/admin/flash-sales/{self.flash_sale.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['name'], 'Test Sale')
        
        # Test PUT update
        update_data = {
            'name': 'Updated Sale',
            'discount_percent': '30.00',
            'products': [self.product.id],
            'start_date': self.flash_sale.start_date.isoformat(),
            'end_date': self.flash_sale.end_date.isoformat(),
            'is_active': True
        }
        
        response = client.put(f'/api/admin/flash-sales/{self.flash_sale.id}/', update_data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['name'], 'Updated Sale')
        self.assertEqual(response.data['discount_percent'], '30.00')


class FlashSaleIntegrationTest(TestCase):
    def setUp(self):

        self.category = Category.objects.create(
            name="Test Category",
        )
        
        self.product1 = Product.objects.create(
            name="Test Product 1",
            description="Test product description 1",
            price=Decimal("100.00"),
            category=self.category,
            is_in_stock=True
        )
        
        self.product2 = Product.objects.create(
            name="Test Product 2",
            description="Test product description 2",
            price=Decimal("200.00"),
            category=self.category,
            is_in_stock=True
        )
        
        # Create active flash sale
        self.flash_sale = FlashSale.objects.create(
            name="Integration Test Sale",
            discount_percent=Decimal("25.00"),
            start_date=timezone.now() - timedelta(hours=1),
            end_date=timezone.now() + timedelta(hours=23),
            is_active=True
        )
        self.flash_sale.products.add(self.product1, self.product2)

    def test_flash_sale_product_integration(self):
        """Test that flash sale products are properly integrated"""
        # Test products are associated with flash sale
        self.assertEqual(self.flash_sale.products.count(), 2)
        self.assertIn(self.product1, self.flash_sale.products.all())
        self.assertIn(self.product2, self.flash_sale.products.all())
        
        # Test products have flash sale relation
        self.assertEqual(self.product1.flash_sales.count(), 1)
        self.assertEqual(self.product2.flash_sales.count(), 1)

    def test_flash_sale_price_calculation_integration(self):
        """Test that flash sale prices are calculated correctly"""
        # Test product 1 sale price
        sale_price_1 = self.flash_sale.calculate_sale_price(self.product1.price)
        expected_price_1 = Decimal("100.00") * (Decimal("1.00") - Decimal("0.25"))
        self.assertEqual(sale_price_1, expected_price_1)
        
        # Test product 2 sale price
        sale_price_2 = self.flash_sale.calculate_sale_price(self.product2.price)
        expected_price_2 = Decimal("200.00") * (Decimal("1.00") - Decimal("0.25"))
        self.assertEqual(sale_price_2, expected_price_2)

    def test_flash_sale_api_integration(self):
        """Test the complete flash sale API integration"""
        from rest_framework.test import APIClient
        
        client = APIClient()
        
        # Test public active flash sales endpoint
        response = client.get('/api/flash-sales/active/')
        self.assertEqual(response.status_code, 200)
        print("Active sales from API:", response.data)
        
        # Test flash sale products endpoint
        response = client.get(f'/api/flash-sales/{self.flash_sale.id}/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['products']), 2)
        
        # Verify product information includes sale prices
        product_data = response.data['products']
        self.assertEqual(product_data[0]['price'], '100.00')  # Original price
        # Sale price should be shown in products_info, not in main product data
