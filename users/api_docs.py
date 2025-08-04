from __future__ import annotations

from django.http import JsonResponse
from django.views import View


class UserAPIDocumentationView(View):
    """View to provide API documentation for user management."""

    def get(self, request):
        """Return API documentation for user management endpoints."""
        documentation = {
            'title': 'Django E-commerce User Management API',
            'version': '1.0.0',
            'description': 'API endpoints for administrative user management',
            'authorization': {
                'type': 'Bearer Token',
                'description': 'All endpoints require authentication with a valid admin user token',
                'how_to_obtain': 'POST to /api/auth/login/ with valid admin credentials',
                'example': {
                    'request': {
                        'url': '/api/auth/login/',
                        'method': 'POST',
                        'body': {
                            'email': 'admin@example.com',
                            'password': 'your_password',
                        },
                    },
                    'response': {
                        'user': {
                            'id': 1,
                            'email': 'admin@example.com',
                            'first_name': 'Admin',
                            'last_name': 'User',
                        },
                        'token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                        'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                    },
                },
            },
            'endpoints': {
                'user_list': {
                    'url': '/api/admin/users/',
                    'method': 'GET',
                    'description': 'Get paginated list of all users',
                    'permissions': ['Admin users only (is_staff=True)'],
                    'query_parameters': {
                        'search': 'Search by email, first_name, last_name, or phone_number',
                        'is_active': 'Filter by active status (true/false)',
                        'is_staff': 'Filter by staff status (true/false)',
                        'ordering': 'Order by fields: email, first_name, last_name, created_at, updated_at, is_active, is_staff. Prefix with - for descending order.',
                        'page': 'Page number for pagination',
                        'page_size': 'Number of results per page (max 100)',
                    },
                    'response_example': {
                        'count': 8,
                        'next': 'http://example.com/api/admin/users/?page=2',
                        'previous': None,
                        'results': [
                            {
                                'id': 1,
                                'email': 'user1@example.com',
                                'first_name': 'John',
                                'last_name': 'Doe',
                                'full_name': 'John Doe',
                                'phone_number': '+1234567890',
                                'is_active': True,
                                'is_staff': False,
                                'created_at': '2025-01-01T00:00:00Z',
                                'updated_at': '2025-01-01T00:00:00Z',
                            },
                        ],
                    },
                },
                'user_detail': {
                    'url': '/api/admin/users/{user_id}/',
                    'method': 'GET',
                    'description': 'Get detailed information about a specific user',
                    'permissions': ['Admin users only (is_staff=True)'],
                    'response_example': {
                        'id': 1,
                        'email': 'user1@example.com',
                        'first_name': 'John',
                        'last_name': 'Doe',
                        'full_name': 'John Doe',
                        'phone_number': '+1234567890',
                        'is_active': True,
                        'is_staff': False,
                        'is_superuser': False,
                        'last_login': '2025-07-25T14:30:00Z',
                        'last_login_formatted': '2025-07-25 14:30:00',
                        'created_at': '2025-01-01T00:00:00Z',
                        'updated_at': '2025-01-01T00:00:00Z',
                    },
                },
                'user_deactivate': {
                    'url': '/api/admin/users/{user_id}/deactivate/',
                    'method': 'POST',
                    'description': 'Deactivate a user account',
                    'permissions': ['Admin users only (is_staff=True)'],
                    'restrictions': [
                        'Cannot deactivate your own account',
                        'Cannot deactivate superuser accounts',
                    ],
                    'request_body': {
                        'reason': 'Optional reason for deactivation',
                    },
                    'response_example': {
                        'detail': 'User has been deactivated successfully',
                        'user': {
                            'id': 1,
                            'email': 'user1@example.com',
                            'first_name': 'John',
                            'last_name': 'Doe',
                            'full_name': 'John Doe',
                            'phone_number': '+1234567890',
                            'is_active': False,
                            'is_staff': False,
                            'is_superuser': False,
                            'last_login': '2025-07-25T14:30:00Z',
                            'last_login_formatted': '2025-07-25 14:30:00',
                            'created_at': '2025-01-01T00:00:00Z',
                            'updated_at': '2025-08-04T10:15:00Z',
                        },
                    },
                },
                'user_reactivate': {
                    'url': '/api/admin/users/{user_id}/deactivate/',
                    'method': 'PATCH',
                    'description': 'Reactivate a previously deactivated user account',
                    'permissions': ['Admin users only (is_staff=True)'],
                    'response_example': {
                        'detail': 'User has been reactivated successfully',
                        'user': {
                            'id': 1,
                            'email': 'user1@example.com',
                            'first_name': 'John',
                            'last_name': 'Doe',
                            'full_name': 'John Doe',
                            'phone_number': '+1234567890',
                            'is_active': True,
                            'is_staff': False,
                            'is_superuser': False,
                            'last_login': '2025-07-25T14:30:00Z',
                            'last_login_formatted': '2025-07-25 14:30:00',
                            'created_at': '2025-01-01T00:00:00Z',
                            'updated_at': '2025-08-04T10:20:00Z',
                        },
                    },
                },
            },
            'examples': {
                'search_users': '/api/admin/users/?search=john',
                'filter_active_users': '/api/admin/users/?is_active=true',
                'filter_admin_users': '/api/admin/users/?is_staff=true',
                'sort_by_email': '/api/admin/users/?ordering=email',
                'combine_filters': '/api/admin/users/?is_active=true&search=john&ordering=-created_at',
            },
            'error_responses': {
                'authentication_error': {
                    'status': 401,
                    'example': {'detail': 'Authentication credentials were not provided.'},
                },
                'permission_error': {
                    'status': 403,
                    'example': {'detail': 'You do not have permission to perform this action.'},
                },
                'user_not_found': {
                    'status': 404,
                    'example': {'detail': 'User not found'},
                },
                'deactivate_own_account': {
                    'status': 400,
                    'example': {'detail': 'Cannot deactivate your own account'},
                },
                'deactivate_superuser': {
                    'status': 400,
                    'example': {'detail': 'Cannot deactivate superuser accounts'},
                },
                'already_active': {
                    'status': 400,
                    'example': {'detail': 'User is already active'},
                },
            },
        }

        return JsonResponse(documentation, json_dumps_params={'indent': 2})
