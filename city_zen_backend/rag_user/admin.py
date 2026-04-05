from django.contrib import admin
from .models import CustomUser
from django.contrib.auth.admin import UserAdmin


class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Information', {'fields': ('image','gender','birth_date','is_verified')}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile Information', {'fields': ('image','gender','birth_date','is_verified')}),
    )



admin.site.register(CustomUser, CustomUserAdmin)