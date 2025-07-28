from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models import BaseModel


class Cart(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
    )
    items = models.JSONField(default=list)

    class Meta:
        db_table = 'carts'

    def __str__(self):
        return f"Cart for {self.user.email}"
