from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from rest_framework import permissions
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserDeactivateSerializer
from .serializers import UserDetailSerializer
from .serializers import UserListSerializer
from core.constants import PaginationSettings

User = get_user_model()


class UserPagination(PageNumberPagination):
    page_size = PaginationSettings.USER_LIST_PAGE_SIZE
    page_size_query_param = 'page_size'
    max_page_size = PaginationSettings.MAX_PAGE_SIZE


class AdminUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    pagination_class = UserPagination

    def get(self, request):
        """
        Get paginated list of users with optional search and filtering
        Query parameters:
        - search: Search by email, first_name, or last_name
        - is_active: Filter by active status (true/false)
        - is_staff: Filter by staff status (true/false)
        - ordering: Order by field (default: -created_at)
        """
        queryset = User.objects.all()

        # Search functionality
        search = request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone_number__icontains=search),
            )

        # Filter by active status
        is_active = request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)

        # Filter by staff status
        is_staff = request.query_params.get('is_staff', None)
        if is_staff is not None:
            is_staff_bool = is_staff.lower() == 'true'
            queryset = queryset.filter(is_staff=is_staff_bool)

        # Ordering
        ordering = request.query_params.get('ordering', '-created_at')
        allowed_orderings = [
            'email', '-email', 'first_name', '-first_name',
            'last_name', '-last_name', 'created_at', '-created_at',
            'is_active', '-is_active', 'is_staff', '-is_staff',
        ]
        if ordering in allowed_orderings:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        # Pagination
        paginator = self.pagination_class()
        paginated_queryset = paginator.paginate_queryset(queryset, request)

        serializer = UserListSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminUserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request, user_id):
        try:
            user = get_object_or_404(User, id=user_id)
            serializer = UserDetailSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {'detail': _('User not found')},
                status=status.HTTP_404_NOT_FOUND,
            )


class AdminUserDeactivateView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request, user_id):
        try:
            user = get_object_or_404(User, id=user_id)

            # Prevent admin from deactivating themselves (check this first)
            if user == request.user:
                return Response(
                    {'detail': _('Cannot deactivate your own account')},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Prevent deactivating superusers
            if user.is_superuser:
                return Response(
                    {'detail': _('Cannot deactivate superuser accounts')},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = UserDeactivateSerializer(data=request.data)
            if serializer.is_valid():
                user.is_active = False
                user.save(update_fields=['is_active', 'updated_at'])

                return Response(
                    {
                        'detail': _('User has been deactivated successfully'),
                        'user': UserDetailSerializer(user).data,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        except User.DoesNotExist:
            return Response(
                {'detail': _('User not found')},
                status=status.HTTP_404_NOT_FOUND,
            )

    def patch(self, request, user_id):
        """Reactivate a user account"""
        try:
            user = get_object_or_404(User, id=user_id)

            if user.is_active:
                return Response(
                    {'detail': _('User is already active')},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.is_active = True
            user.save(update_fields=['is_active', 'updated_at'])

            return Response(
                {
                    'detail': _('User has been reactivated successfully'),
                    'user': UserDetailSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )

        except User.DoesNotExist:
            return Response(
                {'detail': _('User not found')},
                status=status.HTTP_404_NOT_FOUND,
            )
