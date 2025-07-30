from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from core.constants import FieldLengths
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
