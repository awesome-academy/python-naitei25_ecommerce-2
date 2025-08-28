# products/tests.py
from __future__ import annotations

import os
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from orders.models import FlashSale, Order, OrderItem
from products.models import Category, Product
from cart.models import Cart


def _extract_results(data):
    """
    Helper: some list endpoints may be paginated (dict with 'results'),
    others may return a plain list depending on global DRF settings.
    """
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


class ProductsViewsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        User = get_user_model()
        self.admin = User.objects.create_user(
            email=os.getenv("ADMIN_EMAIL"),
            password=os.getenv("ADMIN_PASSWORD"),
            is_staff=True
        )
        self.user = User.objects.create_user(
            email=os.getenv("USER_EMAIL"),
            password=os.getenv("USER_PASSWORD"),
            is_staff=False
        )

        # Categories (note: intentionally out of alpha order to test ordering)
        self.cat_b = Category.objects.create(name="Beverages")
        self.cat_a = Category.objects.create(name="Appliances")

        # Products
        self.p1 = Product.objects.create(
            name="Red Kettle",
            description="Small electric kettle",
            price=Decimal("19.99"),
            image_urls=["http://example.com/k1.jpg"],
            category=self.cat_a,
            specification=[],
            is_in_stock=True,
        )
        self.p2 = Product.objects.create(
            name="Blue Kettle",
            description="Large electric kettle",
            price=Decimal("29.99"),
            image_urls=["http://example.com/k2.jpg"],
            category=self.cat_a,
            specification=[],
            is_in_stock=False,
        )
        self.p3 = Product.objects.create(
            name="Orange Juice",
            description="Fresh juice",
            price=Decimal("3.50"),
            image_urls=["http://example.com/j1.jpg"],
            category=self.cat_b,
            specification=[],
            is_in_stock=True,
        )

        self.client = APIClient()

    # ---------- Category list ----------
    def test_category_list_is_ordered_by_name(self):
        url = reverse("products:api_category_list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = [c["name"] for c in results]
        # Expect alphabetical: Appliances, Beverages
        self.assertEqual(names, ["Appliances", "Beverages"])

    # ---------- Admin list (permissions) ----------
    def test_admin_list_requires_staff(self):
        url = reverse("products:admin_product_list_create")
        # Anonymous -> 401 (IsAdminUser)
        resp_anon = self.client.get(url)
        self.assertIn(resp_anon.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

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
        url = reverse("products:admin_product_list_create")
        resp = self.client.get(url, {"category": str(self.cat_a.id)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        ids = {p["id"] for p in results}
        self.assertTrue(self.p1.id in ids and self.p2.id in ids)
        self.assertFalse(self.p3.id in ids)

    def test_admin_list_filter_is_in_stock_true(self):
        self.client.force_authenticate(self.admin)
        url = reverse("products:admin_product_list_create")
        resp = self.client.get(url, {"is_in_stock": "true"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p["name"] for p in results}
        self.assertIn("Red Kettle", names)
        self.assertIn("Orange Juice", names)
        self.assertNotIn("Blue Kettle", names)

    def test_admin_list_filter_is_in_stock_false(self):
        self.client.force_authenticate(self.admin)
        url = reverse("products:admin_product_list_create")
        resp = self.client.get(url, {"is_in_stock": "0"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p["name"] for p in results}
        self.assertIn("Blue Kettle", names)
        self.assertNotIn("Red Kettle", names)
        self.assertNotIn("Orange Juice", names)

    def test_admin_list_search(self):
        self.client.force_authenticate(self.admin)
        url = reverse("products:admin_product_list_create")
        resp = self.client.get(url, {"search": "kettle"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p["name"] for p in results}
        self.assertSetEqual(names, {"Red Kettle", "Blue Kettle"})

    def test_admin_list_ordering_price_desc(self):
        self.client.force_authenticate(self.admin)
        url = reverse("products:admin_product_list_create")
        resp = self.client.get(url, {"ordering": "-price"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        # First should be most expensive
        self.assertGreaterEqual(Decimal(results[0]["price"]), Decimal(results[-1]["price"]))

    # ---------- Admin delete constraints ----------
    def test_admin_delete_blocked_by_orderitem(self):
        self.client.force_authenticate(self.admin)
        url = reverse("products:admin_product_detail", args=[self.p1.id])
        # Patch OrderItem.objects.filter(...).exists() -> True
        with patch("products.views.OrderItem.objects.filter") as mock_filter:
            mock_qs = MagicMock()
            mock_qs.exists.return_value = True
            mock_filter.return_value = mock_qs
            resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("in an order", resp.json().get("detail", ""))

    def test_admin_delete_blocked_by_cart(self):
        self.client.force_authenticate(self.admin)
        url = reverse("products:admin_product_detail", args=[self.p1.id])
        # OrderItem exists() -> False; Cart exists() -> True
        with patch("products.views.OrderItem.objects.filter") as mock_order_filter, patch(
            "products.views.Cart.objects.filter"
        ) as mock_cart_filter:
            mock_qs_order = MagicMock()
            mock_qs_order.exists.return_value = False
            mock_order_filter.return_value = mock_qs_order

            mock_qs_cart = MagicMock()
            mock_qs_cart.exists.return_value = True
            mock_cart_filter.return_value = mock_qs_cart

            resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("shopping cart", resp.json().get("detail", ""))

    def test_admin_delete_success(self):
        self.client.force_authenticate(self.admin)
        url = reverse("products:admin_product_detail", args=[self.p3.id])
        with patch("products.views.OrderItem.objects.filter") as mock_order_filter, patch(
            "products.views.Cart.objects.filter"
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
        url = reverse("products:api_product_list")
        resp = self.client.get(url, {"category": str(self.cat_b.id)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p["name"] for p in results}
        self.assertIn("Orange Juice", names)
        # p2 is out-of-stock -> public list should exclude it
        self.assertNotIn("Blue Kettle", names)

    def test_public_list_search_and_price_range(self):
        url = reverse("products:api_product_list")
        resp = self.client.get(url, {"search": "kettle", "min_price": "15", "max_price": "25"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        names = {p["name"] for p in results}
        # Only Red Kettle (19.99) matches range; Blue is 29.99
        self.assertEqual(names, {"Red Kettle"})

    def test_public_list_ordering(self):
        url = reverse("products:api_product_list")
        resp = self.client.get(url, {"ordering": "price"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _extract_results(resp.json())
        prices = [Decimal(p["price"]) for p in results]
        self.assertEqual(prices, sorted(prices))

    # ---------- Product detail ----------
    def test_product_detail(self):
        url = reverse("products:api_product_detail", args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["id"], self.p1.id)
        self.assertEqual(data["name"], "Red Kettle")

    # ---------- Instant search ----------
    def test_instant_search_query_and_limit(self):
        url = reverse("products:instant_product_search")
        # query that matches both kettles; but limit=1 should return only one
        resp = self.client.get(url, {"q": "kettle", "limit": "1"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json().get("results", [])
        self.assertTrue(len(results) <= 1)

        # Empty query -> empty results
        resp_empty = self.client.get(url, {"q": ""})
        self.assertEqual(resp_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_empty.json().get("results", []), [])

class ProductsFlashSalePricingTests(ProductsViewsTests):
    """
    Extends the base fixtures from ProductsViewsTests.
    Verifies sale-aware fields on list/detail endpoints.
    """

    def _q(self, d: Decimal) -> str:
        # helper: quantize to 0.01 as string like serializers do
        return str(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    def test_list_includes_sale_fields_when_flash_sale_active(self):
        now = timezone.now()
        # 20% off on p1 (19.99 -> 15.99)
        fs = FlashSale.objects.create(
            name="Test Sale",
            discount_percent=Decimal("20.00"),
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(hours=1),
            is_active=True,
        )
        fs.products.add(self.p1)

        url = reverse("products:api_product_list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        results = data.get("results", data)

        # find p1 row
        row = next(r for r in results if r["id"] == self.p1.id)
        expected_sale = self._q(Decimal("19.99") * Decimal("0.80"))

        # original price is still there
        self.assertEqual(row["price"], self._q(Decimal("19.99")))
        # effective/sale reflect discount
        self.assertEqual(row["effective_price"], expected_sale)
        self.assertEqual(row["sale_price"], expected_sale)
        self.assertEqual(row["discount_percent"], 20.0)
        self.assertIsInstance(row["flash_sale_info"], dict)
        self.assertEqual(row["flash_sale_info"]["id"], fs.id)

        # p2 is out of stock — must not appear even if added to sale
        fs.products.add(self.p2)
        resp2 = self.client.get(url)
        results2 = resp2.json().get("results", [])
        ids2 = {r["id"] for r in results2}
        self.assertNotIn(self.p2.id, ids2)

    def test_detail_sale_fields_when_active(self):
        now = timezone.now()
        fs = FlashSale.objects.create(
            name="Detail Sale",
            discount_percent=Decimal("30.00"),  # 19.99 -> 13.99
            start_date=now - timedelta(minutes=10),
            end_date=now + timedelta(minutes=10),
            is_active=True,
        )
        fs.products.add(self.p1)

        url = reverse("products:api_product_detail", args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        expected_sale = self._q(Decimal("19.99") * Decimal("0.70"))

        self.assertEqual(data["price"], self._q(Decimal("19.99")))
        self.assertEqual(data["effective_price"], expected_sale)
        self.assertEqual(data["sale_price"], expected_sale)
        self.assertEqual(data["discount_percent"], 30.0)
        self.assertIsNotNone(data["flash_sale_info"])
        self.assertEqual(data["flash_sale_info"]["id"], fs.id)

    def test_upcoming_or_expired_sales_do_not_apply(self):
        now = timezone.now()

        upcoming = FlashSale.objects.create(
            name="Upcoming",
            discount_percent=Decimal("50.00"),
            start_date=now + timedelta(hours=1),
            end_date=now + timedelta(hours=2),
            is_active=True,
        )
        upcoming.products.add(self.p1)

        expired = FlashSale.objects.create(
            name="Expired",
            discount_percent=Decimal("90.00"),
            start_date=now - timedelta(hours=2),
            end_date=now - timedelta(hours=1),
            is_active=True,
        )
        expired.products.add(self.p1)

        url = reverse("products:api_product_detail", args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        # No discount should be applied
        self.assertEqual(data["price"], self._q(Decimal("19.99")))
        self.assertEqual(data["effective_price"], self._q(Decimal("19.99")))
        self.assertIsNone(data["sale_price"])
        self.assertIsNone(data["discount_percent"])
        self.assertIsNone(data["flash_sale_info"])

    def test_highest_discount_wins_when_overlapping(self):
        now = timezone.now()
        sale10 = FlashSale.objects.create(
            name="10off",
            discount_percent=Decimal("10.00"),
            start_date=now - timedelta(minutes=30),
            end_date=now + timedelta(minutes=30),
            is_active=True,
        )
        sale25 = FlashSale.objects.create(
            name="25off",
            discount_percent=Decimal("25.00"),
            start_date=now - timedelta(minutes=5),
            end_date=now + timedelta(minutes=5),
            is_active=True,
        )
        sale10.products.add(self.p1)
        sale25.products.add(self.p1)

        url = reverse("products:api_product_detail", args=[self.p1.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        # expect 25% applied
        expected_sale = self._q(Decimal("19.99") * Decimal("0.75"))
        self.assertEqual(data["sale_price"], expected_sale)
        self.assertEqual(data["discount_percent"], 25.0)


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
