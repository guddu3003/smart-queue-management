from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .services import QueueService, AIQueueAssistant
import json

def receptionist_dashboard(request):
    ai_data = AIQueueAssistant.predict_rush_hours()
    return render(request, 'clinic/receptionist.html', {'ai_data': ai_data})

def patient_view(request):
    return render(request, 'clinic/patient.html')

# --- API Endpoints ---

@csrf_exempt
def api_add_patient(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        print("✅ DATA RECEIVED FROM WEBSITE:", data)
        QueueService.add_patient(data['name'], data['phone'], data['priority'])
        return JsonResponse({"status": "success"})

@csrf_exempt
def api_call_next(request):
    if request.method == 'POST':
        QueueService.call_next()
        return JsonResponse({"status": "success"})

def api_get_queue(request):
    data = QueueService.get_live_queue_data()
    return JsonResponse(data)