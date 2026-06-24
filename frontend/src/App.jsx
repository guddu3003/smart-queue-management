import React, { useState, useEffect } from 'react';

export default function SmartQueue() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'patient' ? 'patient' : 'receptionist';
  }); 
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [time, setTime] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  
  // API URL Logic
  const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:8000/api' 
    : 'https://your-deployed-backend-url.com/api'; // REPLACE THIS URL AFTER DEPLOYING DJANGO

  const [nowServing, setNowServing] = useState({ token: 'A24', name: 'Rahul Sharma', room: 'Consultation Room 1' });
  const [queue, setQueue] = useState([
    { id: 1, token: 'A25', name: 'Priya Verma', priority: 'Normal', wait: 5 },
    { id: 2, token: 'A26', name: 'Arjun Patel', priority: 'Senior Citizen', wait: 12 }
  ]);
  
  const [stats, setStats] = useState({ total: 86, avgWait: 24, consulted: 72 });
  const [formData, setFormData] = useState({ name: '', phone: '', priority: 'Normal' });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoCall, setAutoCall] = useState(false);

  const patientQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/?view=patient')}&color=0B1E59`;

  // --- LIVE CLOCK ---
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- BACKEND SYNC ---
  const fetchQueueData = async () => {
    try {
      const response = await fetch(`${API_BASE}/data/`);
      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue || []);
        setNowServing({ token: data.now_serving || '--', name: data.serving_name || 'Available', room: 'Consultation Room 1' });
        setIsBackendConnected(true);
      }
    } catch (error) {
      setIsBackendConnected(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 3000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    if (soundEnabled) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const patientData = { name: formData.name, phone: formData.phone, priority: formData.priority || 'Normal' };

    if (isBackendConnected) {
      try {
        await fetch(`${API_BASE}/add/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patientData)
        });
        fetchQueueData();
      } catch (error) { console.error(error); }
    } else {
      const lastTokenNum = queue.length > 0 ? parseInt(queue[queue.length - 1].token.substring(1)) : 24;
      const newToken = `A${lastTokenNum + 1}`;
      const newPatient = { id: Date.now(), token: newToken, name: patientData.name, priority: patientData.priority, wait: (queue.length + 1) * 7 };
      setQueue([...queue, newPatient]);
    }

    setStats({ ...stats, total: stats.total + 1 });
    showToast(`Token generated for ${patientData.name}`);
    setFormData({ name: '', phone: '', priority: 'Normal' });
  };

  const handleCallNext = async () => {
    if (queue.length === 0) { showToast('Queue is empty', 'error'); return; }

    if (isBackendConnected) {
      try {
        await fetch(`${API_BASE}/next/`, { method: 'POST' });
        fetchQueueData();
      } catch (error) { console.error(error); }
    } else {
      const nextPatient = queue[0];
      setNowServing({ token: nextPatient.token, name: nextPatient.name, room: 'Consultation Room 1' });
      setQueue(queue.slice(1));
    }
    setStats({ ...stats, consulted: stats.consulted + 1 });
    showToast(`Now calling next patient`);
  };

  // ... (Rest of the component remains the same)
  return <div>{/* UI content as provided previously */}</div>;
}