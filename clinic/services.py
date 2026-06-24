from pymongo import MongoClient
from datetime import datetime

MONGO_URI = 'mongodb://localhost:27017/smartqueue'
client = MongoClient(MONGO_URI)

# --- ADD THIS VERIFICATION BLOCK ---
try:
    client.admin.command('ping')
    print("✅ SUCCESS: Connected to MongoDB!")
except Exception as e:
    print(f"❌ ERROR: MongoDB Connection Failed. Is MongoDB running? Details: {e}")
# -----------------------------------

db = client['smartqueue_db']
patients_collection = db['patients']

# ... (rest of the code remains exactly the same)

class QueueService:
    @staticmethod
    def add_patient(name, phone, priority="Normal"):
        # Count current waiting patients to generate the next token (e.g., A101, A102)
        count = patients_collection.count_documents({"status": "Waiting"})
        token = f"A{count + 101}"
        
        # Create the document for MongoDB
        patient_doc = {
            "token": token,
            "name": name,
            "phone": phone,
            "priority": priority,
            "status": "Waiting", # Statuses: Waiting, Serving, Done
            "created_at": datetime.utcnow()
        }
        
        # Insert into MongoDB
        patients_collection.insert_one(patient_doc)
        return {"status": "success", "token": token}

    @staticmethod
    def get_live_queue_data():
        # Fetch all 'Waiting' patients, sorted by oldest first
        waiting_cursor = patients_collection.find({"status": "Waiting"}).sort("created_at", 1)
        waiting_patients = list(waiting_cursor)
        
        # Fetch the currently 'Serving' patient
        serving = patients_collection.find_one({"status": "Serving"})
        
        # Dynamic Wait Time Logic
        avg_consult_time = 12 
        
        queue_list = []
        for index, p in enumerate(waiting_patients):
            queue_list.append({
                "token": p["token"],
                "name": p["name"],
                "priority": p["priority"],
                "est_wait": (index + 1) * avg_consult_time
            })
            
        return {
            "now_serving": serving["token"] if serving else "--",
            "serving_name": serving["name"] if serving else "Available",
            "queue": queue_list
        }

    @staticmethod
    def call_next():
        # 1. Mark the currently 'Serving' patient as 'Done'
        patients_collection.update_one(
            {"status": "Serving"},
            {"$set": {"status": "Done"}}
        )
        
        # 2. Find the next person in line (oldest 'Waiting')
        next_patient = patients_collection.find_one(
            {"status": "Waiting"},
            sort=[("created_at", 1)]
        )
        
        # 3. Update their status to 'Serving'
        if next_patient:
            patients_collection.update_one(
                {"_id": next_patient["_id"]},
                {"$set": {"status": "Serving"}}
            )
        return {"status": "success"}

class AIQueueAssistant:
    @staticmethod
    def predict_rush_hours():
        # Ready for your AI integration later!
        return {
            "predicted_wait": "28 minutes",
            "high_rush": "4 PM - 6 PM",
            "best_time": "10 AM - 12 PM"
        }