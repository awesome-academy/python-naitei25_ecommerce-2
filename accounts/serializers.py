from django.contrib.auth import get_user_model
from rest_framework import serializers
from allauth.socialaccount.models import SocialAccount
from dj_rest_auth.registration.serializers import SocialLoginSerializer

User = get_user_model()

class CustomSocialLoginSerializer(SocialLoginSerializer):
    def validate(self, attrs):
        email = attrs.get('email')
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if User.objects.filter(email=email).exists():
            return attrs
        return super().validate(attrs)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'phone_number',
            'gender', 'date_of_birth', 'address', 'avatar'
        )
        read_only_fields = ('id', 'email')
