from __future__ import annotations

from django.http import JsonResponse
from django.views import View


class APIDocumentationView(View):
    """View to provide API documentation."""

    def get(self, request):
        """Return API documentation."""
        documentation = {
            'title': 'Django E-commerce Products API',
            'version': '1.0.0',
            'description': 'API endpoints for managing products and categories',
            'endpoints': {
                'categories': {
                    'url': '/api/categories/',
                    'method': 'GET',
                    'description': 'Get list of all categories',
                    'response_example': {
                        'results': [
                            {
                                'id': 1,
                                'name': 'Smartphones',
                                'created_at': '2025-01-01T00:00:00Z',
                                'updated_at': '2025-01-01T00:00:00Z',
                            },
                        ],
                    },
                },
                'products': {
                    'url': '/api/products/',
                    'method': 'GET',
                    'description': 'Get paginated list of products',
                    'query_parameters': {
                        'category': 'Filter by category ID',
                        'search': 'Search in product name and description',
                        'min_price': 'Minimum price filter',
                        'max_price': 'Maximum price filter',
                        'ordering': 'Order by: name, -name, price, -price, created_at, -created_at',
                        'page': 'Page number for pagination',
                    },
                    'response_example': {
                        'count': 8,
                        'next': 'http://example.com/api/products/?page=2',
                        'previous': None,
                        'results': [
                            {
                                'id': 1,
                                'name': 'iPhone 15 Pro',
                                'price': '999.00',
                                'first_image': 'https://example.com/images/iphone15pro.jpg',
                                'category': {
                                    'id': 1,
                                    'name': 'Smartphones',
                                    'created_at': '2025-01-01T00:00:00Z',
                                    'updated_at': '2025-01-01T00:00:00Z',
                                },
                                'is_in_stock': True,
                                'created_at': '2025-01-01T00:00:00Z',
                                'updated_at': '2025-01-01T00:00:00Z',
                            },
                        ],
                    },
                },
                'product_detail': {
                    'url': '/api/products/{id}/',
                    'method': 'GET',
                    'description': 'Get detailed information about a specific product',
                    'response_example': {
                        'id': 1,
                        'name': 'iPhone 15 Pro',
                        'description': 'Latest iPhone with A17 Pro chip and titanium design',
                        'price': '999.00',
                        'image_urls': [
                            'https://example.com/images/iphone15pro.jpg',
                            'https://example.com/images/iphone15pro-2.jpg',
                        ],
                        'category': {
                            'id': 1,
                            'name': 'Smartphones',
                            'created_at': '2025-01-01T00:00:00Z',
                            'updated_at': '2025-01-01T00:00:00Z',
                        },
                        'specification': [
                            {'key': 'Storage', 'value': '128GB'},
                            {'key': 'Display', 'value': '6.1-inch Super Retina XDR'},
                        ],
                        'is_in_stock': True,
                        'created_at': '2025-01-01T00:00:00Z',
                        'updated_at': '2025-01-01T00:00:00Z',
                    },
                },
            },
            'examples': {
                'filter_by_category': '/api/products/?category=1',
                'search_products': '/api/products/?search=iphone',
                'price_range': '/api/products/?min_price=500&max_price=1000',
                'sort_by_price': '/api/products/?ordering=price',
                'combine_filters': '/api/products/?category=1&min_price=500&ordering=-price',
            },
        }

        return JsonResponse(documentation, json_dumps_params={'indent': 2})
