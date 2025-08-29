from __future__ import annotations

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
import json

from cart.models import Cart
from products.models import Product, Category

User = get_user_model()


class CartModelTest(TestCase):
    """Test cases for Cart model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(
            user=self.user,
            items=[
                {
                    'product_id': 1,
                    'quantity': 2,
                    'price': '10.00',
                    'name': 'Test Product',
                    'image': 'test.jpg'
                }
            ]
        )

    def test_cart_creation(self):
        """Test cart creation with valid data"""
        self.assertEqual(self.cart.user.email, 'test@example.com')
        self.assertEqual(len(self.cart.items), 1)
        self.assertEqual(self.cart.items[0]['product_id'], 1)

    def test_get_item_count(self):
        """Test get_item_count method"""
        self.assertEqual(self.cart.get_item_count(), 1)
        
        # Add another item and test again
        self.cart.items.append({
            'product_id': 2,
            'quantity': 1,
            'price': '5.00',
            'name': 'Another Product',
            'image': 'test2.jpg'
        })
        self.assertEqual(self.cart.get_item_count(), 2)

    def test_get_total(self):
        """Test get_total method"""
        self.assertEqual(self.cart.get_total(), 20.00)
        
        # Add another item and test again
        self.cart.items.append({
            'product_id': 2,
            'quantity': 1,
            'price': '5.00',
            'name': 'Another Product',
            'image': 'test2.jpg'
        })
        self.assertEqual(self.cart.get_total(), 25.00)


class CartAPITest(APITestCase):
    """Test cases for Cart API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        
        # Get JWT token for authentication
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        
        # Set the authorization header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create a category first
        self.category = Category.objects.create(name='Test Category')
        
        # Create test products
        self.product1 = Product.objects.create(
            name='Test Product 1',
            description='Test description 1',
            price=10.00,
            image_urls=['test1.jpg'],
            category=self.category,
            specification={},
            is_in_stock=True,
            stock_quantity=10
        )
        
        self.product2 = Product.objects.create(
            name='Test Product 2',
            description='Test description 2',
            price=15.00,
            image_urls=['test2.jpg'],
            category=self.category,
            specification={},
            is_in_stock=True,
            stock_quantity=5
        )
        
        self.cart_urls = {
            'add': reverse('api_add_to_cart'),
            'get': reverse('api_get_cart'),
            'summary': reverse('api_get_cart_summary'),
            'update': reverse('api_update_cart_item'),
            'remove': reverse('api_remove_from_cart'),
            'clear': reverse('api_clear_cart'),
        }

    def test_add_to_cart(self):
        """Test adding a product to cart"""
        data = {
            'product_id': self.product1.id,
            'quantity': 2
        }
        response = self.client.post(
            self.cart_urls['add'], 
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['cart_item_count'], 1)
        self.assertEqual(response.data['cart_total'], 20.00)

    def test_add_to_cart_multiple_items(self):
        """Test adding multiple products to cart"""
        # Add first product
        data1 = {
            'product_id': self.product1.id,
            'quantity': 2
        }
        response1 = self.client.post(
            self.cart_urls['add'], 
            json.dumps(data1),
            content_type='application/json'
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Add second product
        data2 = {
            'product_id': self.product2.id,
            'quantity': 1
        }
        response2 = self.client.post(
            self.cart_urls['add'], 
            json.dumps(data2),
            content_type='application/json'
        )
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['status'], 'success')
        self.assertEqual(response2.data['cart_item_count'], 2)
        self.assertEqual(response2.data['cart_total'], 35.00)  # 2*10 + 1*15

    def test_get_cart(self):
        """Test retrieving cart contents"""
        # First add an item
        add_data = {
            'product_id': self.product1.id,
            'quantity': 2
        }
        self.client.post(
            self.cart_urls['add'], 
            json.dumps(add_data),
            content_type='application/json'
        )
        
        # Then get the cart
        response = self.client.get(self.cart_urls['get'])
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(response.data['total'], 20.00)
        self.assertEqual(response.data['items'][0]['product_id'], self.product1.id)
        self.assertEqual(response.data['items'][0]['quantity'], 2)

    def test_get_cart_summary(self):
        """Test retrieving cart summary"""
        # First add an item
        add_data = {
            'product_id': self.product1.id,
            'quantity': 2
        }
        self.client.post(
            self.cart_urls['add'], 
            json.dumps(add_data),
            content_type='application/json'
        )
        
        # Then get the summary
        response = self.client.get(self.cart_urls['summary'])
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['cart_item_count'], 1)
        self.assertEqual(response.data['cart_total'], 20.00)

    def test_update_cart_item(self):
        """Test updating cart item quantity"""
        # First add an item
        add_data = {
            'product_id': self.product1.id,
            'quantity': 2
        }
        self.client.post(
            self.cart_urls['add'], 
            json.dumps(add_data),
            content_type='application/json'
        )
        
        # Then update it
        update_data = {
            'product_id': self.product1.id,
            'quantity': 3
        }
        response = self.client.post(
            self.cart_urls['update'], 
            json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['cart_item_count'], 1)
        self.assertEqual(response.data['cart_total'], 30.00)  # 3*10

    def test_remove_from_cart(self):
        """Test removing an item from cart"""
        # First add an item
        add_data = {
            'product_id': self.product1.id,
            'quantity': 2
        }
        self.client.post(
            self.cart_urls['add'], 
            json.dumps(add_data),
            content_type='application/json'
        )
        
        # Then remove it
        remove_data = {
            'product_id': self.product1.id
        }
        response = self.client.post(
            self.cart_urls['remove'], 
            json.dumps(remove_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['cart_item_count'], 0)
        self.assertEqual(response.data['cart_total'], 0.00)

    def test_clear_cart(self):
        """Test clearing the entire cart"""
        # First add items
        add_data1 = {
            'product_id': self.product1.id,
            'quantity': 2
        }
        self.client.post(
            self.cart_urls['add'], 
            json.dumps(add_data1),
            content_type='application/json'
        )
        
        add_data2 = {
            'product_id': self.product2.id,
            'quantity': 1
        }
        self.client.post(
            self.cart_urls['add'], 
            json.dumps(add_data2),
            content_type='application/json'
        )
        
        # Then clear the cart
        response = self.client.post(
            self.cart_urls['clear'],
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['cart_item_count'], 0)
        self.assertEqual(response.data['cart_total'], 0.00)

    def test_add_to_cart_invalid_data(self):
        """Test adding to cart with invalid data"""
        data = {
            'product_id': 'invalid',  # Should be integer
            'quantity': 0  # Should be at least 1
        }
        response = self.client.post(
            self.cart_urls['add'], 
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['status'], 'error')

    def test_remove_nonexistent_item(self):
        """Test removing a product that's not in the cart"""
        data = {
            'product_id': 999  # Non-existent product
        }
        response = self.client.post(
            self.cart_urls['remove'], 
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['status'], 'error')

    def test_add_to_cart_nonexistent_product(self):
        """Test adding a non-existent product to cart"""
        data = {
            'product_id': 999,  # Non-existent product
            'quantity': 1
        }
        response = self.client.post(
            self.cart_urls['add'], 
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['status'], 'error')

    def test_update_nonexistent_item(self):
        """Test updating a product that's not in the cart"""
        data = {
            'product_id': 999,  # Non-existent product
            'quantity': 3
        }
        response = self.client.post(
            self.cart_urls['update'], 
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['status'], 'error')

    def test_clear_empty_cart(self):
        """Test clearing an already empty cart"""
        response = self.client.post(
            self.cart_urls['clear'],
            content_type='application/json'
        )   
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['status'], 'error')

    def test_unauthorized_access(self):
        """Test accessing cart endpoints without authentication"""
        # Create a new client without authentication
        unauth_client = APIClient()
        
        response = unauth_client.get(self.cart_urls['get'])
        # Should return 401 or 403 depending on your auth setup
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
