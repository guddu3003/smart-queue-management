from django.urls import path
from . import views

urlpatterns = [
    path('', views.receptionist_dashboard, name='dashboard'),
    path('patient/', views.patient_view, name='patient_view'),
    path('api/add/', views.api_add_patient, name='api_add'),
    path('api/next/', views.api_call_next, name='api_next'),
    path('api/data/', views.api_get_queue, name='api_data'),
]