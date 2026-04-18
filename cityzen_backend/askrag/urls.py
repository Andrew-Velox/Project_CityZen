from django.contrib import admin
from django.urls import path,include,re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter




router = DefaultRouter()


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('' , SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),


    path('user/',include('user_cs.urls')),
    path('report/',include('report_cz.urls')),
    path('faq/',include('faq_cz.urls')),
    path('community/',include('community_cz.urls')),
    path('rag/',include('rag_cz.urls')),

] 

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Ensure local dev server can serve media files even when DEBUG=False.
urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
