from django.urls import path
from .views import register, login
from accounts import views

app_name = 'accounts'
urlpatterns = [
    path('register/', register, name='register'),
    path('login/', login, name='login'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
]
