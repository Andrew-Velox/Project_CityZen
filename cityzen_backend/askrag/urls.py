from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter




router = DefaultRouter()


urlpatterns = [
    path('admin/', admin.site.urls),
    # path('api/',include('rag_service.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('' , SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),


    path('user/',include('rag_user.urls')),

] 

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
