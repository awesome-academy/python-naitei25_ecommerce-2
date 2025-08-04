from __future__ import annotations

from django.urls import path

from .api_docs import UserAPIDocumentationView
from .views import AdminUserDeactivateView
from .views import AdminUserDetailView
from .views import AdminUserListView

app_name = 'users'

urlpatterns = [
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path(
        'admin/users/<int:user_id>/',
        AdminUserDetailView.as_view(), name='admin-user-detail',
    ),
    path(
        'admin/users/<int:user_id>/deactivate/',
        AdminUserDeactivateView.as_view(), name='admin-user-deactivate',
    ),
    path(
        'admin/users/docs/', UserAPIDocumentationView.as_view(),
        name='user-api-docs',
    ),
]
