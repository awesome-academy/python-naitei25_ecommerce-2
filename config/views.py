from __future__ import annotations

from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from rest_framework.response import Response
from rest_framework import status
from dotenv import load_dotenv
import os

load_dotenv()


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = os.environ.get('GOOGLE_CALLBACK_URL')
    client_class = OAuth2Client

    def post(self, request, *args, **kwargs):
        try:
            input_data = request.data.copy()  # Create a mutable copy
            print("Input data:", input_data)
            
            if 'id_token' in input_data:
                input_data['access_token'] = input_data['id_token']
                
            # Create new request with modified data
            request._full_data = input_data  # Use _full_data instead of data
            
            response = super().post(request, *args, **kwargs)
            return response
            
        except Exception as e:
            print("Google login error:", str(e))
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
