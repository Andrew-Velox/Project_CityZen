from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
# Create your models here.


USER_GENDER_CHOICES = (
    ('Male', 'Male'),
    ('Female', 'Female'),
)

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    image = models.ImageField(upload_to="users/user_img/", null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=USER_GENDER_CHOICES, null=True, blank=True)
    is_verified = models.BooleanField(default=False)


    def __str__(self):
        return self.username


