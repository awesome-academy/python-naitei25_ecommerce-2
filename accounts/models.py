from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from core.constants import FieldLengths, Gender
from core.models import BaseModel

from .managers import UserManager
class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    email = models.EmailField(
        max_length=FieldLengths.EMAIL,
        unique=True,
    )
    first_name = models.CharField(
        max_length=FieldLengths.NAME,
        blank=True,
    )
    last_name = models.CharField(
        max_length=FieldLengths.NAME,
        blank=True,
    )
    phone_number = models.CharField(
        max_length=FieldLengths.PHONE,
        blank=True,
    )

    gender = models.CharField(
        max_length=FieldLengths.GENDER,
        choices= Gender.choices(),
        blank=True,
        null=True,
    )
    date_of_birth = models.DateField(
        null=True,
        blank=True,
    )
    address = models.TextField(
        max_length=FieldLengths.ADDRESS,
        blank=True,
        null=True,
    )
    avatar = models.CharField(
        max_length=FieldLengths.URL,
        blank=True,
        null=True,
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email'], name='idx_users_email'),
        ]

    def __str__(self):
        return self.email
