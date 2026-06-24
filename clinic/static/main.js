// Function to fetch live data from the server
// Utility function to get Django's CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
async function fetchQueueData() {
    try {
        const response = await fetch('/api/data/');
        const data = await response.json();
        updateDashboardUI(data);
        updatePatientUI(data);
    } catch (error) {
        console.error("Error fetching queue:", error);
    }
}

// Update the Receptionist Dashboard
function updateDashboardUI(data) {
    const currentTokenEl = document.getElementById('current-token');
    const queueTableBody = document.getElementById('queueTableBody');
    const queueCount = document.getElementById('live-queue-count');

    if (currentTokenEl) {
        currentTokenEl.innerText = data.now_serving;
        document.getElementById('current-name').innerText = data.serving_name;
        queueCount.innerText = data.queue.length;

        // Repopulate table
        queueTableBody.innerHTML = '';
        data.queue.forEach(patient => {
            const row = `<tr>
                <td><strong>${patient.token}</strong></td>
                <td>${patient.name}</td>
                <td><span class="badge ${patient.priority.toLowerCase()}">${patient.priority}</span></td>
                <td>${patient.est_wait} min</td>
            </tr>`;
            queueTableBody.innerHTML += row;
        });
    }
}


// Handle 'Call Next' Button
const callNextBtn = document.getElementById('callNextBtn');
if (callNextBtn) {
    callNextBtn.addEventListener('click', async () => {
        await fetch('/api/next/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        fetchQueueData(); // Instantly refresh the screen
    });
}

// Update the Patient Mobile View
function updatePatientUI(data) {
    const patientTokenEl = document.getElementById('patient-current-token');
    if (patientTokenEl) {
        patientTokenEl.innerText = data.now_serving;
        document.getElementById('people-ahead').innerText = data.queue.length;
        // In a real app, you'd filter this array to find the specific user's wait time
    }
}

// Handle Form Submission smoothly
// Debugging check: Does the JS even see the form?
const form = document.getElementById('addPatientForm');
console.log("🔍 Looking for form... Found:", form);

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page from reloading
        console.log("✅ Form submitted! Gathering data...");

        const payload = {
            name: document.getElementById('pName').value,
            phone: document.getElementById('pPhone').value,
            priority: document.getElementById('pPriority').value
        };

        console.log("📦 Data gathered:", payload);

        try {
            console.log("🚀 Sending data to Python (/api/add/)...");
            const response = await fetch('/api/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // CSRF Token is temporarily removed here since we exempted it in views.py
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            console.log("🎯 Python replied:", result);

            form.reset();
            fetchQueueData(); 
        } catch (error) {
            console.error("❌ CRITICAL ERROR sending to Python:", error);
        }
    });
} else {
    console.error("❌ ERROR: Could not find the form with id 'addPatientForm' in the HTML!");
}
// Poll every 3 seconds for live sync
setInterval(fetchQueueData, 3000);
fetchQueueData(); // Initial call