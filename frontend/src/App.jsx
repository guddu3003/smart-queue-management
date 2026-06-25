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
  
  // API URL Logic for Local and Deployment
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api' 
    : 'https://smart-queue-management-hk45.onrender.com/api'; // REPLACE THIS LATER WHEN YOU DEPLOY BACKEND

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

  // --- NOTIFICATION SYSTEM ---
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

  // --- ACTIONS ---
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
      const lastTokenNum = queue.length > 0 ? parseInt(queue[queue.length - 1].token.substring(1)) : parseInt(nowServing.token.substring(1)) || 24;
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

  const aiInsights = {
    statusTitle: queue.length > 4 ? 'High Volume Detected' : 'Optimal Capacity',
    statusColor: queue.length > 4 ? 'text-orange-500' : 'text-emerald-500 dark:text-emerald-400',
    statusText: queue.length > 4 ? 'Expect delays up to 15 minutes past scheduled times.' : 'Operating within optimal efficiency parameters.',
    estWait: queue.length > 0 ? queue.length * 7 : 0,
    bestTime: '10:00 AM - 11:30 AM',
  };

  const getBadgeStyle = (priority) => {
    if (priority === 'Emergency') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-sm';
    if (priority === 'Senior Citizen') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-sm';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm';
  };

  const ClinicLogo = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.5 14h-1v-4H6v-1h3.5V8h1v4H14v1h-3.5v4z"/>
      <path d="M16 8h-1.5v3.5h-3V13h3v3.5H16V13h3.5v-1.5H16z" className="text-blue-300 opacity-50 dark:opacity-30"/>
    </svg>
  );

  const AuraLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
       <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
       <circle cx="12" cy="12" r="4"/>
    </svg>
  );

  const ToastNotification = () => {
    if (!toast) return null;
    return (
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 toast-enter">
        <div className={`px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 backdrop-blur-md ${toast.type === 'error' ? 'bg-red-600/95 text-white' : 'bg-gray-900/95 text-white'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      </div>
    );
  };

  // --- RECEPTIONIST MAIN LAYOUT ---
  if (view === 'receptionist') {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <div className="flex h-screen bg-[#F4F7FE] dark:bg-[#0f172a] font-sans overflow-hidden transition-colors duration-300 text-slate-900 dark:text-white">
          <ToastNotification />
          
          <div className="w-72 bg-gradient-to-b from-[#0B1E59] to-[#1A367D] dark:from-[#020617] dark:to-[#0f172a] text-white flex flex-col p-6 shadow-2xl z-10 border-r border-white/5 transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg text-blue-600 p-2 transform hover:scale-105 transition-transform">
                <ClinicLogo />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">SmartQueue</h2>
                <p className="text-xs text-blue-300 font-medium">Next-Gen Clinic</p>
              </div>
            </div>

            <nav className="flex flex-col gap-2 flex-grow overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-xs font-bold text-blue-300/70 uppercase tracking-wider mb-2 mt-2">Main Menu</p>
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-white/15 backdrop-blur-sm border border-white/10 shadow-inner text-white' : 'hover:bg-white/5 text-blue-200'}`}>📊 Dashboard</button>
              
              <p className="text-xs font-bold text-blue-300/70 uppercase tracking-wider mb-2 mt-6">Clinic Management</p>
              <button onClick={() => setActiveTab('about')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === 'about' ? 'bg-white/15 backdrop-blur-sm border border-white/10 shadow-inner text-white' : 'hover:bg-white/5 text-blue-200'}`}>🏥 About Clinic</button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === 'settings' ? 'bg-white/15 backdrop-blur-sm border border-white/10 shadow-inner text-white' : 'hover:bg-white/5 text-blue-200'}`}>⚙️ Settings</button>
            </nav>

            <div className="mt-4 mb-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center border border-white/10 text-center">
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Scan for Patient App</p>
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <img src={patientQRUrl} alt="Patient QR Code" className="w-24 h-24" />
              </div>
            </div>

            <button 
              onClick={() => setView('patient')}
              className="mt-auto py-3.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 rounded-xl font-bold shadow-lg transform hover:-translate-y-1 transition-all duration-200 text-emerald-950 flex items-center justify-center gap-2"
            >
              📱 View Patient App
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10">
            <div className="flex justify-between items-end mb-10">
              <div>
                <p className="text-blue-500 dark:text-blue-400 font-bold mb-1 tracking-wider uppercase text-xs flex items-center gap-3">
                  {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  <span className={`px-2 py-0.5 rounded text-[10px] ${isBackendConnected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400'}`}>
                    {isBackendConnected ? '🟢 MONGODB CONNECTED' : '🔗 LOCAL MODE'}
                  </span>
                </p>
                <h1 className="text-3xl font-extrabold text-[#1B2559] dark:text-white">
                  {activeTab === 'dashboard' ? 'Welcome to, Smartqueue 🩺' : 
                   activeTab === 'about' ? 'Clinic Profile 🏥' : 
                   'System Settings ⚙️'}
                </h1>
              </div>
              <div className="flex items-center gap-6">
                <div className="px-5 py-2.5 bg-white dark:bg-slate-800 rounded-full text-sm font-bold text-[#1B2559] dark:text-blue-100 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-2 transition-colors">
                  ⏱️ {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>

            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'Total Patients', value: stats.total, icon: '👥', color: 'from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40', text: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Avg. Wait Time', value: `${stats.avgWait}m`, icon: '⏳', color: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/40', text: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Consulted', value: stats.consulted, icon: '✅', color: 'from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40', text: 'text-purple-600 dark:text-purple-400' },
                    { label: 'In Queue', value: queue.length, icon: '🛑', color: 'from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40', text: 'text-orange-600 dark:text-orange-400', live: true }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-50 dark:border-slate-700 flex items-center gap-5 transform hover:-translate-y-1 transition-all duration-300">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${stat.color} text-2xl relative shadow-inner`}>
                        {stat.live && queue.length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse"></span>}
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-gray-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className={`text-3xl font-black ${stat.text}`}>{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-50 dark:border-slate-700 relative overflow-hidden group transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <h3 className="text-xl font-extrabold text-[#1B2559] dark:text-white mb-5 relative z-10 flex items-center gap-2">➕ Add Patient</h3>
                    <form onSubmit={handleAddPatient} className="flex flex-col gap-4 relative z-10">
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Patient Full Name" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all" required />
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone Number" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all" />
                      
                      <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all appearance-none cursor-pointer">
                        <option value="Normal">Normal</option>
                        <option value="Senior Citizen">Senior Citizen</option>
                        <option value="Emergency">Emergency</option>
                      </select>

                      <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-[#0A369D] hover:from-[#0A369D] hover:to-blue-800 text-white font-bold py-4 rounded-xl mt-2 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200">
                        Generate Token
                      </button>
                    </form>
                  </div>

                  <div className="bg-gradient-to-br from-[#0B1E59] via-[#0A369D] to-blue-600 rounded-3xl p-8 shadow-2xl text-white flex flex-col justify-between relative overflow-hidden border border-blue-400/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse"></div>
                    <div className="flex justify-between items-start z-10">
                      <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping"></span>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-green-100">Now Serving</h3>
                      </div>
                    </div>
                    <div className="flex justify-between items-end z-10 mt-6">
                      <div>
                        <h1 className="text-7xl font-black tracking-tighter drop-shadow-2xl">{nowServing.token}</h1>
                        <p className="text-xl font-medium text-blue-100 mt-2">{nowServing.name}</p>
                      </div>
                      <button onClick={handleCallNext} className="bg-white text-[#0A369D] px-6 py-4 rounded-2xl font-black text-sm shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transform transition-all duration-200 border-2 border-white/50">
                        Call Next →
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-3xl p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-indigo-100 dark:border-slate-700 relative overflow-hidden transition-colors">
                    <div className="absolute -bottom-10 -right-10 text-indigo-500/5 dark:text-indigo-400/5 w-48 h-48">
                      <AuraLogo />
                    </div>
                    <h3 className="text-xl font-extrabold text-[#1B2559] dark:text-white mb-6 flex items-center gap-3">
                      <span className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><AuraLogo /></span> 
                      Aura Intelligence
                    </h3>
                    <div className="space-y-4 relative z-10">
                      <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-indigo-50 dark:border-slate-700/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Queue Dynamics</p>
                        <p className={`font-bold text-lg mb-1 ${aiInsights.statusColor}`}>{aiInsights.statusTitle}</p>
                        <p className="text-sm text-[#1B2559] dark:text-gray-300 font-medium leading-relaxed">{aiInsights.statusText}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-indigo-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-indigo-50 dark:border-slate-700/50">
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Est. Wait</p>
                          <p className="font-black text-2xl text-[#1B2559] dark:text-white">{aiInsights.estWait} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">min</span></p>
                        </div>
                        <div className="bg-indigo-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-indigo-50 dark:border-slate-700/50">
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Optimal Visit</p>
                          <p className="font-black text-lg text-[#1B2559] dark:text-white mt-1">10:00 AM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-50 dark:border-slate-700 transition-colors">
                  <h3 className="text-xl font-extrabold text-[#1B2559] dark:text-white flex items-center gap-3 mb-6">
                    Live Queue List 
                  </h3>
                  <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700">
                    <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                      <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr className="text-gray-400 dark:text-slate-400 text-xs uppercase tracking-wider">
                          <th className="p-4 font-bold rounded-tl-2xl">Token</th>
                          <th className="p-4 font-bold">Patient Details</th>
                          <th className="p-4 font-bold">Priority</th>
                          <th className="p-4 font-bold text-right rounded-tr-2xl">Est. Wait</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                        {queue.length > 0 ? queue.map((p, index) => (
                          <tr key={p.id || index} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                            <td className="p-4 font-black text-xl text-[#0A369D] dark:text-blue-400 w-32">{p.token}</td>
                            <td className="p-4"><p className="text-[#1B2559] dark:text-white font-bold text-base">{p.name}</p></td>
                            <td className="p-4"><span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${getBadgeStyle(p.priority)}`}>{p.priority}</span></td>
                            <td className="p-4 text-right"><span className="inline-flex items-center justify-center bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold px-3 py-1.5 rounded-lg text-sm">{p.wait} min</span></td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-gray-400 dark:text-slate-500 font-medium bg-gray-50/50 dark:bg-slate-900/20">
                              <div className="text-4xl mb-3">☕</div>
                              The queue is currently empty.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'about' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-sm border border-gray-50 dark:border-slate-700 transition-colors max-w-4xl">
                <div className="flex items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-700 pb-8">
                  <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl p-4">
                    <ClinicLogo />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#1B2559] dark:text-white mb-2">SmartQueue Health Center</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Providing next-generation, AI-driven healthcare experiences.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-blue-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-blue-100 dark:border-slate-700/50">
                    <h3 className="text-xl font-bold text-[#1B2559] dark:text-white mb-4">Clinic Timings</h3>
                    <ul className="space-y-3 text-gray-600 dark:text-gray-300 font-medium">
                      <li className="flex justify-between items-center"><span>Monday - Friday</span> <span className="font-bold text-[#0A369D] dark:text-blue-400">09:00 AM - 08:00 PM</span></li>
                      <li className="flex justify-between items-center"><span>Saturday</span> <span className="font-bold text-[#0A369D] dark:text-blue-400">09:00 AM - 02:00 PM</span></li>
                      <li className="flex justify-between items-center"><span>Sunday</span> <span className="font-bold text-red-500">Closed (Emergency Only)</span></li>
                    </ul>
                  </div>
                  
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-400 mb-4">Our Specialties</h3>
                    <ul className="space-y-2 text-emerald-800 dark:text-emerald-300 font-medium list-disc pl-5">
                      <li>General Consultation & Checkups</li>
                      <li>Pediatric Care & Vaccinations</li>
                      <li>24/7 Advanced Vitals Tracking</li>
                      <li>Priority Senior Citizen Routing</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-sm border border-gray-50 dark:border-slate-700 transition-colors max-w-3xl">
                <h2 className="text-2xl font-bold text-[#1B2559] dark:text-white mb-8 border-b border-gray-100 dark:border-slate-700 pb-4">Application Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 transition-colors">
                    <div>
                      <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Dark Mode Theme</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Switch between light and dark UI aesthetics.</p>
                    </div>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`w-16 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-8' : ''}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 transition-colors">
                    <div>
                      <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Notification Sounds</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Play a chime when a new token is generated or called.</p>
                    </div>
                    <button 
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`w-16 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${soundEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${soundEnabled ? 'translate-x-8' : ''}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 transition-colors">
                    <div>
                      <h3 className="text-lg font-bold text-[#1B2559] dark:text-white">Auto-Call Next Patient</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automatically call the next person when a consultation ends.</p>
                    </div>
                    <button 
                      onClick={() => setAutoCall(!autoCall)}
                      className={`w-16 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${autoCall ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${autoCall ? 'translate-x-8' : ''}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- PATIENT VIEW (Mobile Layout) ---
  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-200 dark:bg-slate-900 flex items-center justify-center p-4 font-sans bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] transition-colors duration-300">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-gray-900 dark:border-black relative ring-4 ring-gray-900/50 dark:ring-black/50 transition-colors duration-300">
          
          <div className="bg-[#0B1E59] dark:bg-[#020617] text-white pt-10 pb-12 rounded-b-[2.5rem] text-center relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-600/30 to-transparent"></div>
            <h2 className="text-xl font-bold tracking-tight relative z-10 flex items-center justify-center gap-2">
              <span className="w-6 h-6 inline-block"><ClinicLogo/></span> SmartQueue
            </h2>
            <p className="text-blue-200 text-sm font-medium mt-1 relative z-10">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div className="mx-6 -mt-10 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgb(0,0,0,0.5)] p-6 text-center border border-gray-50 dark:border-slate-700 relative z-20 transition-colors duration-300">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Now Serving</p>
            </div>
            <h1 className="text-7xl font-black text-[#0A369D] dark:text-blue-400 drop-shadow-sm tracking-tighter">{nowServing.token}</h1>
            <div className="mt-3 py-1.5 bg-gray-50 dark:bg-slate-900 rounded-lg text-gray-500 dark:text-gray-400 text-sm font-bold border border-gray-100 dark:border-slate-700">
              {nowServing.room}
            </div>
          </div>

          <div className="p-6 pt-8">
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-3xl p-7 border border-blue-100 dark:border-slate-700 shadow-inner relative overflow-hidden transition-colors duration-300">
              <p className="text-sm font-bold text-blue-800/60 dark:text-blue-400/60 uppercase tracking-wider mb-1">Your Assigned Token</p>
              <h2 className="text-4xl font-black text-[#1B2559] dark:text-white mb-6">
                {queue.length > 0 ? queue[queue.length - 1].token : '--'}
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-slate-700 transition-colors duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center font-bold">👥</div>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">People ahead</span>
                  </div>
                  <span className="font-black text-xl text-orange-500">{queue.length}</span>
                </div>
                
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-slate-700 transition-colors duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center font-bold">⏱️</div>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Estimated wait</span>
                  </div>
                  <span className="font-black text-xl text-[#1B2559] dark:text-white">
                    {queue.length > 0 ? queue[queue.length - 1].wait : 0} <span className="text-sm font-normal text-gray-400">min</span>
                  </span>
                </div>
              </div>
              
              <div className={`mt-6 p-4 border rounded-xl text-sm flex items-start gap-3 transition-colors duration-300 ${queue.length > 4 ? 'bg-orange-50 border-orange-100 text-orange-800 dark:bg-orange-900/20 dark:border-orange-900/30 dark:text-orange-300' : 'bg-indigo-50 border-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-900/30 dark:text-indigo-300'}`}>
                <span className="w-5 h-5 flex-shrink-0 mt-0.5"><AuraLogo /></span>
                <p><strong>Aura AI:</strong> {queue.length > 4 ? "It is quite busy. Feel free to grab a coffee nearby, we'll save your spot!" : "Please have a seat, the doctor will see you shortly."}</p>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 pb-8">
            <button 
              onClick={() => {
                window.history.pushState({}, '', '/');
                setView('receptionist');
              }}
              className="w-full bg-gray-900 dark:bg-black hover:bg-black dark:hover:bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 border dark:border-slate-800"
            >
              ← Exit Patient Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}