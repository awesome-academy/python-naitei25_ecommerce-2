# products/tests.py
from __future__ import annotations

import os
from datetime import timedelta
from decimal import Decimal
from decimal import ROUND_HALF_UP
from unittest.mock import MagicMock
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from orders.models import FlashSale
from orders.models import Order
from orders.models import OrderItem
from products.models import Category
from products.models import Product
from products.models import ProductReview


def _extract_results(data):
    """
    Helper: some list endpoints may be paginated (dict with 'results'),
    others may return a plain list depending on global DRF settings.
    """
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


class ProductsViewsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        User = get_user_model()
        self.admin = User.objects.create_user(
            email=os.getenv('ADMIN_EMAIL'),
            password=os.getenv('ADMIN_PASSWORD'),
            is_staff=True,
        )
        self.user = User.objects.create_user(
            email=os.getenv('USER_EMAIL'),
            password=os.getenv('USER_PASSWORD'),
            is_staff=False,
        )

        # Categories (note: intentionally out of alpha order to test ordering)
        self.cat_b = Category.objects.create(name='Beverages')
        self.cat_a = Category.objects.create(name='Appliances')

        # Products
        self.p1 = Product.objects.create(
            name='Red Kettle',
            description='Small electric kettle',
            price=Decimal('19.99'),
            image_urls=['http://example.com/k1.jpg'],
            category=self.cat_a,
            specification=[],
            is_in_stock=True,
        )
        self.p2 = Product.objects.create(
            name='Blue Kettle',
            description='Large electric kettle',
            price=Decimal('29.99'),
            image_urls=['http://example.com/k2.jpg'],
            category=self.cat_a,
            specification=[],
            is_in_stock=False,
        )
        self.p3 = Product.objects.create(
            name='Orange Juice',
            description='Fresh juice',
            price=Decimal('3.50'),
            image_urls=['http://example.com/j1.jpg'],
            category=self.cat_b,
            specification=[],
            is_in_stock=True,
        )

        self.client = APIClient()

    # ---------- Category list ----------
    def test_category_list_is_ordered_by_name(self):
        url = reverse('products:api_category_list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = [c['name'] for c in results]
        # Expect alphabetical: Appliances, Beverages
        self.assertEqual(names, ['Appliances', 'Beverages'])

    # ---------- Admin list (permissions) ----------
    def test_admin_list_requires_staff(self):
        url = reverse('products:admin_product_list_create')
        # Anonymous -> 401 (IsAdminUser)
        resp_anon = self.client.get(url)
        self.assertIn(
            resp_anon.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

        # Authenticated non-staff -> 403
        self.client.force_authenticate(self.user)
        resp_user = self.client.get(url)
        self.assertEqual(resp_user.status_code, status.HTTP_403_FORBIDDEN)

        # Staff -> 200
        self.client.force_authenticate(self.admin)
        resp_admin = self.client.get(url)
        self.assertEqual(resp_admin.status_code, status.HTTP_200_OK)

    # ---------- Admin list (filters & search) ----------
    def test_admin_list_filter_by_category(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_list_create')
        resp = self.client.get(url, {'category': str(self.cat_a.id)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        ids = {p['id'] for p in results}
        self.assertTrue(self.p1.id in ids and self.p2.id in ids)
        self.assertFalse(self.p3.id in ids)

    def test_admin_list_filter_is_in_stock_true(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_list_create')
        resp = self.client.get(url, {'is_in_stock': 'true'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p['name'] for p in results}
        self.assertIn('Red Kettle', names)
        self.assertIn('Orange Juice', names)
        self.assertNotIn('Blue Kettle', names)

    def test_admin_list_filter_is_in_stock_false(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_list_create')
        resp = self.client.get(url, {'is_in_stock': '0'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p['name'] for p in results}
        self.assertIn('Blue Kettle', names)
        self.assertNotIn('Red Kettle', names)
        self.assertNotIn('Orange Juice', names)

    def test_admin_list_search(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_list_create')
        resp = self.client.get(url, {'search': 'kettle'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p['name'] for p in results}
        self.assertSetEqual(names, {'Red Kettle', 'Blue Kettle'})

    def test_admin_list_ordering_price_desc(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_list_create')
        resp = self.client.get(url, {'ordering': '-price'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        # First should be most expensive
        self.assertGreaterEqual(
            Decimal(results[0]['price']), Decimal(results[-1]['price']),
        )

    # ---------- Admin delete constraints ----------
    def test_admin_delete_blocked_by_orderitem(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_detail', args=[self.p1.id])
        # Patch OrderItem.objects.filter(...).exists() -> True
        with patch('products.views.OrderItem.objects.filter') as mock_filter:
            mock_qs = MagicMock()
            mock_qs.exists.return_value = True
            mock_filter.return_value = mock_qs
            resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('in an order', resp.json().get('detail', ''))

    def test_admin_delete_blocked_by_cart(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_detail', args=[self.p1.id])
        # OrderItem exists() -> False; Cart exists() -> True
        with patch('products.views.OrderItem.objects.filter') as mock_order_filter, patch(
            'products.views.Cart.objects.filter',
        ) as mock_cart_filter:
            mock_qs_order = MagicMock()
            mock_qs_order.exists.return_value = False
            mock_order_filter.return_value = mock_qs_order

            mock_qs_cart = MagicMock()
            mock_qs_cart.exists.return_value = True
            mock_cart_filter.return_value = mock_qs_cart

            resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('shopping cart', resp.json().get('detail', ''))

    def test_admin_delete_success(self):
        self.client.force_authenticate(self.admin)
        url = reverse('products:admin_product_detail', args=[self.p3.id])
        with patch('products.views.OrderItem.objects.filter') as mock_order_filter, patch(
            'products.views.Cart.objects.filter',
        ) as mock_cart_filter:
            mock_qs_order = MagicMock()
            mock_qs_order.exists.return_value = False
            mock_order_filter.return_value = mock_qs_order

            mock_qs_cart = MagicMock()
            mock_qs_cart.exists.return_value = False
            mock_cart_filter.return_value = mock_qs_cart

            resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=self.p3.id).exists())

    # ---------- Public list ----------
    def test_public_list_category_filter(self):
        url = reverse('products:api_product_list')
        resp = self.client.get(url, {'category': str(self.cat_b.id)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p['name'] for p in results}
        self.assertIn('Orange Juice', names)
        # p2 is out-of-stock -> public list should exclude it
        self.assertNotIn('Blue Kettle', names)

    def test_public_list_search_and_price_range(self):
        url = reverse('products:api_product_list')
        resp = self.client.get(
            url, {'search': 'kettle', 'min_price': '15', 'max_price': '25'},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p['name'] for p in results}
        # Only Red Kettle (19.99) matches range; Blue is 29.99
        self.assertEqual(names, {'Red Kettle'})

    def test_public_list_ordering(self):
        url = reverse('products:api_product_list')
        resp = self.client.get(url, {'ordering': 'price'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        prices = [Decimal(p['price']) for p in results]
        self.assertEqual(prices, sorted(prices))

    # ---------- Product detail ----------
    def test_product_detail(self):
        url = reverse('products:api_product_detail', args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data['id'], self.p1.id)
        self.assertEqual(data['name'], 'Red Kettle')

    # ---------- Instant search ----------
    def test_instant_search_query_and_limit(self):
        url = reverse('products:instant_product_search')
        # query that matches both kettles; but limit=1 should return only one
        resp = self.client.get(url, {'q': 'kettle', 'limit': '1'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json().get('results', [])
        self.assertTrue(len(results) <= 1)

        # Empty query -> empty results
        resp_empty = self.client.get(url, {'q': ''})
        self.assertEqual(resp_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_empty.json().get('results', []), [])


class ProductsFlashSalePricingTests(ProductsViewsTests):
    """
    Extends the base fixtures from ProductsViewsTests.
    Verifies sale-aware fields on list/detail endpoints.
    """

    def _q(self, d: Decimal) -> str:
        # helper: quantize to 0.01 as string like serializers do
        return str(d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    def test_list_includes_sale_fields_when_flash_sale_active(self):
        now = timezone.now()
        # 20% off on p1 (19.99 -> 15.99)
        fs = FlashSale.objects.create(
            name='Test Sale',
            discount_percent=Decimal('20.00'),
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(hours=1),
            is_active=True,
        )
        fs.products.add(self.p1)

        url = reverse('products:api_product_list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        results = data.get('results', data)

        # find p1 row
        row = next(r for r in results if r['id'] == self.p1.id)
        expected_sale = self._q(Decimal('19.99') * Decimal('0.80'))

        # original price is still there
        self.assertEqual(row['price'], self._q(Decimal('19.99')))
        # effective/sale reflect discount
        self.assertEqual(row['effective_price'], expected_sale)
        self.assertEqual(row['sale_price'], expected_sale)
        self.assertEqual(row['discount_percent'], 20.0)
        self.assertIsInstance(row['flash_sale_info'], dict)
        self.assertEqual(row['flash_sale_info']['id'], fs.id)

        # p2 is out of stock — must not appear even if added to sale
        fs.products.add(self.p2)
        resp2 = self.client.get(url)
        results2 = resp2.json().get('results', [])
        ids2 = {r['id'] for r in results2}
        self.assertNotIn(self.p2.id, ids2)

    def test_detail_sale_fields_when_active(self):
        now = timezone.now()
        fs = FlashSale.objects.create(
            name='Detail Sale',
            discount_percent=Decimal('30.00'),  # 19.99 -> 13.99
            start_date=now - timedelta(minutes=10),
            end_date=now + timedelta(minutes=10),
            is_active=True,
        )
        fs.products.add(self.p1)

        url = reverse('products:api_product_detail', args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        expected_sale = self._q(Decimal('19.99') * Decimal('0.70'))

        self.assertEqual(data['price'], self._q(Decimal('19.99')))
        self.assertEqual(data['effective_price'], expected_sale)
        self.assertEqual(data['sale_price'], expected_sale)
        self.assertEqual(data['discount_percent'], 30.0)
        self.assertIsNotNone(data['flash_sale_info'])
        self.assertEqual(data['flash_sale_info']['id'], fs.id)

    def test_upcoming_or_expired_sales_do_not_apply(self):
        now = timezone.now()

        upcoming = FlashSale.objects.create(
            name='Upcoming',
            discount_percent=Decimal('50.00'),
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=2),
            is_active=True,
        )
        upcoming.products.add(self.p1)

        expired = FlashSale.objects.create(
            name='Expired',
            discount_percent=Decimal('90.00'),
            start_date=now - timedelta(hours=2),
            end_date=now - timedelta(hours=1),
            is_active=True,
        )
        expired.products.add(self.p1)

        url = reverse('products:api_product_detail', args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        # No discount should be applied
        self.assertEqual(data['price'], self._q(Decimal('19.99')))
        self.assertEqual(data['effective_price'], self._q(Decimal('19.99')))
        self.assertIsNone(data['sale_price'])
        self.assertIsNone(data['discount_percent'])
        self.assertIsNone(data['flash_sale_info'])

    def test_highest_discount_wins_when_overlapping(self):
        now = timezone.now()
        sale10 = FlashSale.objects.create(
            name='10off',
            discount_percent=Decimal('10.00'),
            start_date=now - timedelta(minutes=30),
            end_date=now + timedelta(minutes=30),
            is_active=True,
        )
        sale25 = FlashSale.objects.create(
            name='25off',
            discount_percent=Decimal('25.00'),
            start_date=now - timedelta(minutes=5),
            end_date=now + timedelta(minutes=5),
            is_active=True,
        )
        sale10.products.add(self.p1)
        sale25.products.add(self.p1)

        url = reverse('products:api_product_detail', args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        # expect 25% applied
        expected_sale = self._q(Decimal('19.99') * Decimal('0.75'))
        self.assertEqual(data['sale_price'], expected_sale)
        self.assertEqual(data['discount_percent'], 25.0)

# ---------- Product Review Tests ----------


class ProductReviewModelTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='testpass123',
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='testpass123',
        )

        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            name='Test Product',
            description='A test product',
            price=Decimal('29.99'),
            category=self.category,
            is_in_stock=True,
        )

    def test_product_review_creation(self):
        """Test creating a product review."""
        review = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=5,
            title='Great product!',
            comment='I really love this product. Highly recommended.',
        )

        self.assertEqual(review.user, self.user1)
        self.assertEqual(review.product, self.product)
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.title, 'Great product!')
        self.assertFalse(review.is_verified_purchase)

    def test_product_review_str_representation(self):
        """Test the string representation of ProductReview."""
        review = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=4,
            title='Good product',
        )

        expected_str = f"{self.user1.email} - {self.product.name} (4/5)"
        self.assertEqual(str(review), expected_str)

    def test_multiple_reviews_allowed(self):
        """Test that a user can review a product multiple times."""
        # Create first review
        review1 = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=5,
            title='First review',
        )

        # Create second review by same user for same product - should be allowed
        review2 = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=3,
            title='Second review',
        )

        # Both reviews should exist
        self.assertTrue(ProductReview.objects.filter(id=review1.id).exists())
        self.assertTrue(ProductReview.objects.filter(id=review2.id).exists())
        self.assertEqual(
            ProductReview.objects.filter(
                user=self.user1, product=self.product,
            ).count(), 2,
        )

    def test_verified_purchase_detection(self):
        """Test that verified purchase is detected correctly."""
        # Create an order with delivered status
        order = Order.objects.create(
            user=self.user1,
            customer_name='Test User',
            customer_phone='1234567890',
            customer_address='123 Test St',
            total_amount=Decimal('29.99'),
            final_amount=Decimal('29.99'),
            order_status='DELIVERED',
        )

        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price_at_order=Decimal('29.99'),
        )

        # Create review - should be marked as verified purchase
        review = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=5,
            title='Verified review',
        )

        self.assertTrue(review.is_verified_purchase)


class ProductAverageRatingTests(TestCase):
    """Test product average rating calculations."""

    def setUp(self):
        User = get_user_model()
        self.users = []
        for i in range(5):
            user = User.objects.create_user(
                email=f"user{i}@example.com",
                password='testpass123',
            )
            self.users.append(user)

        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            name='Test Product',
            description='A test product',
            price=Decimal('29.99'),
            category=self.category,
            is_in_stock=True,
        )

    def test_average_rating_with_no_reviews(self):
        """Test average rating when no reviews exist."""
        self.assertEqual(self.product.average_rating, 0.0)
        self.assertEqual(self.product.total_reviews, 0)

    def test_average_rating_single_review(self):
        """Test average rating with single review."""
        ProductReview.objects.create(
            user=self.users[0],
            product=self.product,
            rating=4,
        )

        self.assertEqual(self.product.average_rating, 4.0)
        self.assertEqual(self.product.total_reviews, 1)

    def test_average_rating_multiple_reviews(self):
        """Test average rating with multiple reviews."""
        ratings = [5, 4, 3, 4, 5]  # Average should be 4.2

        for i, rating in enumerate(ratings):
            ProductReview.objects.create(
                user=self.users[i],
                product=self.product,
                rating=rating,
            )

        self.assertEqual(self.product.average_rating, 4.2)
        self.assertEqual(self.product.total_reviews, 5)

    def test_average_rating_rounding(self):
        """Test that average rating is properly rounded."""
        # Create reviews that result in 3.666... average
        ratings = [3, 4, 4]  # Average = 3.666...

        for i, rating in enumerate(ratings):
            ProductReview.objects.create(
                user=self.users[i],
                product=self.product,
                rating=rating,
            )

        # Should round to 1 decimal
        self.assertEqual(self.product.average_rating, 3.7)


class ProductReviewAPITests(TestCase):
    """Test the Product Review API endpoints."""

    def setUp(self):
        User = get_user_model()
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='testpass123',
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='testpass123',
        )

        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            name='Test Product',
            description='A test product',
            price=Decimal('29.99'),
            category=self.category,
            is_in_stock=True,
        )

        self.client = APIClient()

    def test_list_reviews_unauthenticated(self):
        """Test that unauthenticated users can view reviews."""
        # Create some reviews
        ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=5,
            title='Great!',
            comment='Love it',
        )

        url = reverse(
            'products:api_product_reviews',
            kwargs={'product_id': self.product.id},
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = _extract_results(data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['rating'], 5)

    def test_create_review_authenticated(self):
        """Test creating a review when authenticated."""
        self.client.force_authenticate(self.user1)

        url = reverse(
            'products:api_product_reviews',
            kwargs={'product_id': self.product.id},
        )
        review_data = {
            'rating': 4,
            'title': 'Good product',
            'comment': 'Pretty good overall',
        }

        response = self.client.post(url, review_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that review was created
        review = ProductReview.objects.get(
            user=self.user1, product=self.product,
        )
        self.assertEqual(review.rating, 4)
        self.assertEqual(review.title, 'Good product')

    def test_create_review_unauthenticated(self):
        """Test that unauthenticated users cannot create reviews."""
        url = reverse(
            'products:api_product_reviews',
            kwargs={'product_id': self.product.id},
        )
        review_data = {
            'rating': 4,
            'title': 'Good product',
        }

        response = self.client.post(url, review_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_multiple_reviews_allowed(self):
        """Test that users can review the same product multiple times."""
        # Create first review
        ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=5,
            title='First review',
        )

        self.client.force_authenticate(self.user1)
        url = reverse(
            'products:api_product_reviews',
            kwargs={'product_id': self.product.id},
        )
        review_data = {
            'rating': 3,
            'title': 'Second review',
        }

        response = self.client.post(url, review_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that both reviews exist
        reviews_count = ProductReview.objects.filter(
            user=self.user1, product=self.product,
        ).count()
        self.assertEqual(reviews_count, 2)

    def test_create_review_invalid_rating(self):
        """Test validation for invalid rating values."""
        self.client.force_authenticate(self.user1)
        url = reverse(
            'products:api_product_reviews',
            kwargs={'product_id': self.product.id},
        )

        # Test rating too low
        response = self.client.post(url, {'rating': 0}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test rating too high
        response = self.client.post(url, {'rating': 6}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_nonexistent_product(self):
        """Test creating review for non-existent product."""
        self.client.force_authenticate(self.user1)
        url = reverse(
            'products:api_product_reviews',
            kwargs={'product_id': 99999},
        )
        review_data = {
            'rating': 4,
            'title': 'Good product',
        }

        response = self.client.post(url, review_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_own_review(self):
        """Test that users can update their own reviews."""
        review = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=3,
            title='Original title',
        )

        self.client.force_authenticate(self.user1)
        url = reverse(
            'products:api_product_review_detail', kwargs={
                'product_id': self.product.id,
                'pk': review.id,
            },
        )

        update_data = {
            'rating': 5,
            'title': 'Updated title',
            'comment': 'Much better after update',
        }

        response = self.client.put(url, update_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that review was updated
        review.refresh_from_db()
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.title, 'Updated title')

    def test_cannot_update_others_review(self):
        """Test that users cannot update other users' reviews."""
        review = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=3,
            title="User1's review",
        )

        self.client.force_authenticate(self.user2)
        url = reverse(
            'products:api_product_review_detail', kwargs={
                'product_id': self.product.id,
                'pk': review.id,
            },
        )

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_review(self):
        """Test that users can delete their own reviews."""
        review = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=3,
            title='To be deleted',
        )

        self.client.force_authenticate(self.user1)
        url = reverse(
            'products:api_product_review_detail', kwargs={
                'product_id': self.product.id,
                'pk': review.id,
            },
        )

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProductReview.objects.filter(id=review.id).exists())

    def test_user_reviews_list(self):
        """Test listing all reviews by authenticated user."""
        # Create reviews for different products
        product2 = Product.objects.create(
            name='Product 2',
            price=Decimal('19.99'),
            category=self.category,
            is_in_stock=True,
        )

        review1 = ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=4,
            title='Review 1',
        )
        review2 = ProductReview.objects.create(
            user=self.user1,
            product=product2,
            rating=5,
            title='Review 2',
        )

        # Create review by different user (should not appear)
        ProductReview.objects.create(
            user=self.user2,
            product=self.product,
            rating=3,
            title="Other user's review",
        )

        self.client.force_authenticate(self.user1)
        url = reverse('products:api_user_reviews')

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = _extract_results(data)

        self.assertEqual(len(results), 2)
        review_titles = {r['title'] for r in results}
        self.assertEqual(review_titles, {'Review 1', 'Review 2'})


class ProductSerializerWithReviewsTests(TestCase):
    """Test that product serializers include review information."""

    def setUp(self):
        User = get_user_model()
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='testpass123',
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='testpass123',
        )

        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            name='Test Product',
            description='A test product',
            price=Decimal('29.99'),
            category=self.category,
            is_in_stock=True,
        )

        # Create some reviews
        ProductReview.objects.create(
            user=self.user1,
            product=self.product,
            rating=5,
            title='Excellent!',
            comment='Best product ever',
        )
        ProductReview.objects.create(
            user=self.user2,
            product=self.product,
            rating=4,
            title='Very good',
            comment='Almost perfect',
        )

        self.client = APIClient()

    def test_product_list_includes_rating_info(self):
        """Test that product list includes average rating and total reviews."""
        url = reverse('products:api_product_list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = _extract_results(data)

        product_data = next(p for p in results if p['id'] == self.product.id)

        self.assertEqual(product_data['average_rating'], 4.5)  # (5+4)/2
        self.assertEqual(product_data['total_reviews'], 2)

    def test_product_detail_includes_recent_reviews(self):
        """Test that product detail includes recent reviews."""
        url = reverse('products:api_product_detail', args=[self.product.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['average_rating'], 4.5)
        self.assertEqual(data['total_reviews'], 2)
        self.assertIn('recent_reviews', data)
        self.assertEqual(len(data['recent_reviews']), 2)

        # Check that recent reviews contain expected fields
        review = data['recent_reviews'][0]
        self.assertIn('rating', review)
        self.assertIn('title', review)
        self.assertIn('user_name', review)
        self.assertIn('created_at', review)

    def test_product_detail_limits_recent_reviews(self):
        """Test that recent reviews are limited to 5."""
        User = get_user_model()

        # Create 7 more reviews (total 9)
        for i in range(7):
            user = User.objects.create_user(
                email=f"user{i+3}@example.com",
                password='testpass123',
            )
            ProductReview.objects.create(
                user=user,
                product=self.product,
                rating=3,
                title=f"Review {i+3}",
            )

        url = reverse('products:api_product_detail', args=[self.product.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['total_reviews'], 9)
        self.assertEqual(len(data['recent_reviews']), 5)  # Limited to 5


class ReviewSerializerTests(TestCase):
    """Test the review serializer behavior."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            first_name='John',
        )

        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            name='Test Product',
            price=Decimal('29.99'),
            category=self.category,
            is_in_stock=True,
        )

    def test_review_list_serializer_user_name_with_first_name(self):
        """Test that user name displays first name when available."""
        from products.serializers import ProductReviewListSerializer

        review = ProductReview.objects.create(
            user=self.user,
            product=self.product,
            rating=5,
            title='Great!',
        )

        serializer = ProductReviewListSerializer(review)
        self.assertEqual(serializer.data['user_name'], 'John')

    def test_review_list_serializer_user_name_without_first_name(self):
        """Test that user name displays email prefix when no first name."""
        from products.serializers import ProductReviewListSerializer

        self.user.first_name = ''
        self.user.save()

        review = ProductReview.objects.create(
            user=self.user,
            product=self.product,
            rating=5,
            title='Great!',
        )

        serializer = ProductReviewListSerializer(review)
        # email prefix
        self.assertEqual(serializer.data['user_name'], 'testuser')



class ProductsSoftDeleteTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            email="internpython@gmail.com", password="@dmin123", is_staff=True
        )
        self.user = User.objects.create_user(
            email="huy@gmail.com", password="huy", is_staff=False
        )

        self.cat = Category.objects.create(name="Test Category")
        self.product = Product.objects.create(
            name="Test Product",
            description="Test",
            price=Decimal("10.00"),
            category=self.cat,
            stock_quantity=5,
            is_in_stock=True,
        )

        self.client = APIClient()
        self.client.force_authenticate(self.admin)
    
    def test_create_product(self):
        """Admin có thể tạo sản phẩm mới"""
        url = reverse("products:admin_product_list_create")
        payload = {
            "name": "New Product",
            "description": "Brand new product",
            "price": "99.99",
            "image_urls": ["https://example.com/img1.jpg"],
            "category": self.cat.id,
            "specification": [{"key": "Color", "value": "Black"}],
            "is_in_stock": True,
            "stock_quantity": 10,
        }
        resp = self.client.post(url, data=payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertEqual(data["name"], "New Product")
        self.assertEqual(data["price"], "99.99")
        self.assertEqual(data["category"], self.cat.id)
        self.assertEqual(data["stock_quantity"], 10)
    
    def test_update_product(self):
        """Admin có thể cập nhật product"""
        url = reverse("products:admin_product_detail", args=[self.product.id])
        payload = {
            "name": "Updated Product",
            "description": "Updated description",
            "price": "15.50",
            "stock_quantity": 20,
            "is_in_stock": True,
            "category": self.cat.id,
        }
        resp = self.client.put(url, data=payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["name"], "Updated Product")
        self.assertEqual(data["price"], "15.50")
        self.assertEqual(data["stock_quantity"], 20)

        # check DB
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Updated Product")
        self.assertEqual(str(self.product.price), "15.50")
        self.assertEqual(self.product.stock_quantity, 20)

    
    def test_retrieve_product(self):
        """Admin có thể xem chi tiết product"""
        url = reverse("products:admin_product_detail", args=[self.product.id])
        resp = self.client.get(url)

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["id"], self.product.id)
        self.assertEqual(data["name"], "Test Product")
        self.assertEqual(data["price"], "10.00")

    def test_soft_delete_with_real_orderitem(self):
        """Trường hợp thật: product nằm trong order -> soft delete"""
        order = Order.objects.create(
            user=self.user,
            customer_name="Test User",
            customer_phone="0123456789",
            customer_address="123 Test Street",
            total_amount=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            final_amount=Decimal("0.00"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price_at_order=self.product.price,
        )

        url = reverse("products:admin_product_detail", args=[self.product.id])
        resp = self.client.delete(url)

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertTrue(data["is_soft_deleted"])
        prod = Product.objects.get(id=self.product.id)
        self.assertTrue(prod.is_deleted)
        self.assertIsNotNone(prod.deleted_at)

    def test_soft_delete_with_mocked_orderitem(self):
        """Trường hợp mock: giả lập product có trong order -> soft delete"""
        url = reverse("products:admin_product_detail", args=[self.product.id])

        with patch("products.views.OrderItem.objects.filter") as mock_filter:
            mock_qs = MagicMock()
            mock_qs.exists.return_value = True
            mock_filter.return_value = mock_qs

            resp = self.client.delete(url)

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertTrue(data["is_soft_deleted"])
        prod = Product.objects.get(id=self.product.id)
        self.assertTrue(prod.is_deleted)
        self.assertIsNotNone(prod.deleted_at)

class AdminCategoryCRUDTestCase(APITestCase):
    def setUp(self):
        # Create admin user
        User = get_user_model()
        self.admin = User.objects.create_superuser(
            email="internpython@gmail.com", password="@dmin123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        # URL endpoints
        self.list_create_url = reverse("products:admin_category_list_create")
        self.category = Category.objects.create(name="Phone")

    def test_admin_can_list_categories(self):
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)

    def test_admin_can_create_category(self):
        data = {"name": "Laptop"}
        response = self.client.post(self.list_create_url, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Category.objects.filter(name="Laptop").exists())

    def test_admin_cannot_create_duplicate_category(self):
        data = {"name": "Phone"}  # already exists
        response = self.client.post(self.list_create_url, data, format="json")
        self.assertEqual(response.status_code, 400)

    def test_admin_can_retrieve_category(self):
        url = reverse("products:admin_category_detail", args=[self.category.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], self.category.name)

    def test_admin_can_update_category(self):
        url = reverse("products:admin_category_detail", args=[self.category.id])
        data = {"name": "Smartphone"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, 200)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, "Smartphone")

    def test_admin_can_delete_category(self):
        url = reverse("products:admin_category_detail", args=[self.category.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Category.objects.filter(id=self.category.id).exists())
