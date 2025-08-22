from __future__ import annotations

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core.constants import Gender

User = get_user_model()


class UserProfileAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Tạo user test
        self.user = User.objects.create_user(
            email='admin@gmail.com',
            password='admin',
            first_name='Test',
            last_name='User'
        )
        # Lấy token
        response = self.client.post(reverse('accounts:login'), {
            'email': 'admin@gmail.com',
            'password': 'admin'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.token = response.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_get_profile(self):
        """Test GET /accounts/profile/ returns user info"""
        url = reverse('accounts:profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertEqual(response.data['first_name'], self.user.first_name)
        self.assertEqual(response.data['last_name'], self.user.last_name)

    def test_patch_profile(self):
        """Test PATCH updates partial user info"""
        url = reverse('accounts:profile')
        payload = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'gender': Gender.MALE.value,
            'avatar': 'https://example.com/avatar.png',
            'address': '123 Street, City',
            'date_of_birth': '1990-01-01'
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'Name')
        self.assertEqual(self.user.gender, Gender.MALE.value)
        self.assertEqual(self.user.avatar, 'https://example.com/avatar.png')
        self.assertEqual(str(self.user.date_of_birth), '1990-01-01')
        self.assertEqual(self.user.address, '123 Street, City')

    def test_put_profile(self):
        """Test PUT updates all user info"""
        url = reverse('accounts:profile')
        payload = {
            'first_name': 'NewFirst',
            'last_name': 'NewLast',
            'gender': Gender.FEMALE.value,
            'avatar': 'https://example.com/new_avatar.png',
            'address': '456 Another St',
            'date_of_birth': '2000-12-31',
            'email': 'admin@gmail.com'  # email thường không đổi
        }
        response = self.client.put(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'NewFirst')
        self.assertEqual(self.user.last_name, 'NewLast')
        self.assertEqual(self.user.gender, Gender.FEMALE.value)
        self.assertEqual(self.user.avatar, 'https://example.com/new_avatar.png')
        self.assertEqual(str(self.user.date_of_birth), '2000-12-31')
        self.assertEqual(self.user.address, '456 Another St')

    def test_patch_invalid_gender(self):
        """Test PATCH with invalid gender returns error"""
        url = reverse('accounts:profile')
        payload = {'gender': 'invalid_gender'}
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_access(self):
        """Test accessing profile without token returns 401"""
        self.client.credentials()  # Remove token
        url = reverse('accounts:profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
