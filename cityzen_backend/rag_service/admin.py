from django.contrib import admin
from .models import Document,QueryHistory
# Register your models here.


admin.site.register(Document)
admin.site.register(QueryHistory)