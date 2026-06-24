from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # The default Django admin panel
    path('admin/', admin.site.urls),
    
    # This connects the main project to your clinic app's routes
    path('', include('clinic.urls')),
]