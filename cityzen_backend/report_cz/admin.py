from django.contrib import admin

from .models import Comment, Report, ReportImage

admin.site.register(Report)
admin.site.register(Comment)
admin.site.register(ReportImage)
