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
                                'effective_price': '999.00',
                                'sale_price': None,
                                'discount_percent': None,
                                'flash_sale_info': None,
                                'first_image': 'https://example.com/images/iphone15pro.jpg',
                                'category': {
                                    'id': 1,
                                    'name': 'Smartphones',
                                    'created_at': '2025-01-01T00:00:00Z',
                                    'updated_at': '2025-01-01T00:00:00Z',
                                },
                                'is_in_stock': True,
                                'average_rating': 4.5,
                                'total_reviews': 12,
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
                        'effective_price': '999.00',
                        'sale_price': None,
                        'discount_percent': None,
                        'flash_sale_info': None,
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
                        'average_rating': 4.5,
                        'total_reviews': 12,
                        'recent_reviews': [
                            {
                                'id': 1,
                                'user_name': 'John',
                                'rating': 5,
                                'title': 'Excellent phone!',
                                'comment': 'Love the camera quality and performance.',
                                'is_verified_purchase': True,
                                'created_at': '2025-01-15T14:30:00Z',
                            },
                            {
                                'id': 2,
                                'user_name': 'Sarah',
                                'rating': 4,
                                'title': 'Great phone, minor issues',
                                'comment': 'Battery could be better but overall very satisfied.',
                                'is_verified_purchase': False,
                                'created_at': '2025-01-10T09:15:00Z',
                            },
                        ],
                        'created_at': '2025-01-01T00:00:00Z',
                        'updated_at': '2025-01-01T00:00:00Z',
                    },
                },
                'product_reviews': {
                    'url': '/api/products/{product_id}/reviews/',
                    'methods': ['GET', 'POST'],
                    'description': 'Get reviews for a product or create a new review',
                    'authentication': 'POST requests require authentication',
                    'post_data': {
                        'rating': 'Required. Integer between 1-5',
                        'title': 'Optional. Review title',
                        'comment': 'Optional. Review comment/description',
                    },
                    'response_example_get': {
                        'results': [
                            {
                                'id': 1,
                                'user_name': 'John',
                                'rating': 5,
                                'title': 'Excellent phone!',
                                'comment': 'Love the camera quality and performance.',
                                'is_verified_purchase': True,
                                'created_at': '2025-01-15T14:30:00Z',
                            },
                            {
                                'id': 2,
                                'user_name': 'Sarah',
                                'rating': 4,
                                'title': 'Great phone, minor issues',
                                'comment': 'Battery could be better but overall very satisfied.',
                                'is_verified_purchase': False,
                                'created_at': '2025-01-10T09:15:00Z',
                            },
                        ],
                    },
                    'response_example_post': {
                        'id': 3,
                        'user_name': 'Mike',
                        'user_email': 'mike@example.com',
                        'rating': 4,
                        'title': 'Good value for money',
                        'comment': 'Solid performance and build quality.',
                        'is_verified_purchase': False,
                        'created_at': '2025-01-20T16:45:00Z',
                        'updated_at': '2025-01-20T16:45:00Z',
                    },
                },
                'product_review_detail': {
                    'url': '/api/products/{product_id}/reviews/{review_id}/',
                    'methods': ['GET', 'PUT', 'PATCH', 'DELETE'],
                    'description': 'Get, update, or delete a specific review (users can only access their own reviews)',
                    'authentication': 'Required for all methods',
                    'put_patch_data': {
                        'rating': 'Integer between 1-5',
                        'title': 'Review title',
                        'comment': 'Review comment/description',
                    },
                    'response_example': {
                        'id': 3,
                        'user_name': 'Mike',
                        'rating': 5,
                        'title': 'Updated: Amazing phone!',
                        'comment': 'After using it for a month, I love it even more!',
                        'is_verified_purchase': True,
                        'created_at': '2025-01-20T16:45:00Z',
                    },
                },
                'user_reviews': {
                    'url': '/api/my-reviews/',
                    'method': 'GET',
                    'description': 'Get all reviews by the authenticated user',
                    'authentication': 'Required',
                    'response_example': {
                        'results': [
                            {
                                'id': 1,
                                'user_name': 'John',
                                'rating': 5,
                                'title': 'Excellent phone!',
                                'comment': 'Love the camera quality and performance.',
                                'is_verified_purchase': True,
                                'created_at': '2025-01-15T14:30:00Z',
                            },
                            {
                                'id': 3,
                                'user_name': 'John',
                                'rating': 4,
                                'title': 'Great laptop',
                                'comment': 'Perfect for coding and everyday tasks.',
                                'is_verified_purchase': False,
                                'created_at': '2025-01-10T12:20:00Z',
                            },
                        ],
                    },
                },
                'instant_search': {
                    'url': '/api/search/products/',
                    'method': 'GET',
                    'description': 'Fast product search with ranking',
                    'query_parameters': {
                        'q': 'Search query (required)',
                        'limit': 'Maximum results to return (default: 10, max: 20)',
                    },
                    'response_example': {
                        'results': [
                            {
                                'id': 1,
                                'name': 'iPhone 15 Pro',
                                'price': '999.00',
                                'first_image': 'https://example.com/images/iphone15pro.jpg',
                                'is_in_stock': True,
                            },
                        ],
                    },
                },
            },
            'examples': {
                'filter_by_category': '/api/products/?category=1',
                'search_products': '/api/products/?search=iphone',
                'price_range': '/api/products/?min_price=500&max_price=1000',
                'sort_by_price': '/api/products/?ordering=price',
                'combine_filters': '/api/products/?category=1&min_price=500&ordering=-price',
                'get_product_reviews': '/api/products/1/reviews/',
                'create_review': 'POST /api/products/1/reviews/ with {"rating": 5, "title": "Great!", "comment": "Love it!"}',
                'update_review': 'PUT /api/products/1/reviews/2/ with updated data',
                'delete_review': 'DELETE /api/products/1/reviews/2/',
                'get_user_reviews': '/api/my-reviews/',
                'instant_search': '/api/search/products/?q=iphone&limit=5',
            },
            'notes': {
                'authentication': 'Use JWT token in Authorization header: "Bearer <token>"',
                'verified_purchase': 'Reviews are automatically marked as verified if user has purchased the product',
                'multiple_reviews': 'Users can create multiple reviews for the same product',
                'review_privacy': 'Users can only view/edit/delete their own reviews',
                'rating_validation': 'Rating must be an integer between 1 and 5',
            },
        }

        return JsonResponse(documentation, json_dumps_params={'indent': 2})
