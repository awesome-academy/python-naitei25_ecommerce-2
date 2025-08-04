from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from products.models import Product
from cart.models import Cart


class CartTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Tạo người dùng
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )

        # Tạo token và gắn vào header
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.access_token)

        # Tạo sản phẩm mẫu
        self.product = Product.objects.create(
            name="Test Product",
            price=100.00
        )
        self.product2 = Product.objects.create(
            name="Test Product 2",
            price=50.00
        )

    def test_authenticated_user_can_add_to_cart(self):
        response = self.client.post('/api/cart/add/', {
            'product_id': self.product.id,
            'quantity': 2
        })

        self.assertEqual(response.status_code, 200)
        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items[0]['quantity'], 2)
        self.assertEqual(cart.items[0]['product_id'], self.product.id)

    def test_authenticated_user_can_view_cart(self):
        cart = Cart.objects.create(user=self.user)
        cart.items = [{
            'product_id': self.product.id,
            'quantity': 3,
            'price': str(self.product.price),
            'name': self.product.name,
            'image': None
        }]
        cart.save()

        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['items'][0]['quantity'], 3)

    def test_add_invalid_product(self):
        response = self.client.post('/api/cart/add/', {
            'product_id': 999,  # không tồn tại
            'quantity': 1
        })
        self.assertEqual(response.status_code, 404)
        self.assertIn('Product not found', response.json()['message'])

    def test_add_invalid_quantity(self):
        response = self.client.post('/api/cart/add/', {
            'product_id': self.product.id,
            'quantity': 0
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid product or quantity', response.json()['message'])
