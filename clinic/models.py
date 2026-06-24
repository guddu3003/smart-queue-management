from django.db import models

class PatientQueue(models.Model):
    token = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    priority = models.CharField(max_length=20, default='Normal')
    status = models.CharField(max_length=20, default='Waiting') # Waiting, Serving, Done
    created_at = models.DateTimeField(auto_now_add=True)