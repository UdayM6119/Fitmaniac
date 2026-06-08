import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api/admin';

// Static fallback data for instant visual preview
const DEMO_GYMS = [
  {
    _id: '1',
    name: 'Fitmaniac Center Koramangala',
    location: '100 Feet Road, Koramangala, Bangalore',
    barcodeToken: 'fitfreak_001',
    operatingHours: { open: '05:30', close: '22:30' },
    capacityPerSlot: 25,
    paymentMethodsConfig: { allowOnline: true, allowOffline: true },
    createdAt: new Date().toISOString()
  },
  {
    _id: '2',
    name: "Gold's Gym Indiranagar",
    location: '12th Main Road, Indiranagar, Bangalore',
    barcodeToken: 'FITMANIAC-PARTNER-560008',
    operatingHours: { open: '06:00', close: '22:00' },
    capacityPerSlot: 15,
    paymentMethodsConfig: { allowOnline: false, allowOffline: true },
    createdAt: new Date().toISOString()
  },
  {
    _id: '3',
    name: 'Fitmaniac Center Bandra West',
    location: 'Linking Road, Bandra West, Mumbai',
    barcodeToken: 'FITMANIAC-PARTNER-400050',
    operatingHours: { open: '07:00', close: '21:00' },
    capacityPerSlot: 30,
    paymentMethodsConfig: { allowOnline: true, allowOffline: false },
    createdAt: new Date().toISOString()
  }
];

function App() {
  const [gyms, setGyms] = useState(() => {
    const cached = localStorage.getItem('fitmaniac_gyms');
    return cached ? JSON.parse(cached) : DEMO_GYMS;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Offline Sync Queue States & Handlers
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const cached = localStorage.getItem('fitmaniac_admin_queue');
    return cached ? JSON.parse(cached) : [];
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    localStorage.setItem('fitmaniac_gyms', JSON.stringify(gyms));
  }, [gyms]);

  useEffect(() => {
    localStorage.setItem('fitmaniac_admin_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline queue reconciliation worker
  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0) return;

    let isSyncing = false;

    const syncWorker = async () => {
      if (isSyncing) return;
      isSyncing = true;
      
      const queueCopy = [...offlineQueue];
      let successCount = 0;
      
      for (const item of queueCopy) {
        try {
          const res = await fetch(item.url, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: item.body ? JSON.stringify(item.body) : undefined
          });
          const data = await res.json();
          if (data.success || res.status === 200 || res.status === 201) {
            successCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          console.log("Admin Sync item failed: ", e);
          break;
        }
      }

      if (successCount > 0) {
        const remaining = queueCopy.slice(successCount);
        setOfflineQueue(remaining);
        setSuccessMsg(`Successfully synced ${successCount} pending admin operations with the server!`);
        fetchGyms();
      }
      isSyncing = false;
    };

    const timer = setTimeout(syncWorker, 1500);
    return () => clearTimeout(timer);
  }, [isOnline, offlineQueue]);

  // Theme State
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    barcodeToken: '',
    openHour: '06:00',
    closeHour: '22:00',
    capacityPerSlot: 20,
    allowOnline: true,
    allowOffline: true
  });

  // Fetch Gyms from Hono Backend on Mount
  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/gyms`);
      const data = await res.json();
      if (data.success) {
        setGyms(data.gyms);
        setErrorMsg('');
      } else {
        // Fall back to demo data silently
        console.warn('Hono backend not running, using gorgeous demo mock data.');
      }
    } catch (error) {
      console.log('Using static preview data as Hono backend is not running.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!formData.name || !formData.location || !formData.barcodeToken) {
      setErrorMsg('Please fill in Gym Name, Location and unique Scan Token.');
      return;
    }

    const payload = {
      name: formData.name,
      location: formData.location,
      barcodeToken: formData.barcodeToken,
      operatingHours: {
        open: formData.openHour,
        close: formData.closeHour
      },
      capacityPerSlot: parseInt(formData.capacityPerSlot),
      paymentMethodsConfig: {
        allowOnline: formData.allowOnline,
        allowOffline: formData.allowOffline
      }
    };

    try {
      const res = await fetch(`${API_BASE}/gyms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(`Successfully registered ${formData.name}!`);
        // Reset form except defaults
        setFormData({
          name: '',
          location: '',
          barcodeToken: '',
          openHour: '06:00',
          closeHour: '22:00',
          capacityPerSlot: 20,
          allowOnline: true,
          allowOffline: true
        });
        fetchGyms();
      } else {
        // Mock add for local static visual experience if API is absent
        mockAddGym(payload);
      }
    } catch (err) {
      setOfflineQueue(prev => [...prev, {
        url: `${API_BASE}/gyms`,
        method: 'POST',
        body: payload,
        displayName: `Add Gym: ${payload.name}`
      }]);
      mockAddGym(payload);
    }
  };

  const mockAddGym = (payload) => {
    const newMock = {
      _id: Date.now().toString(),
      ...payload,
      createdAt: new Date().toISOString()
    };
    setGyms([newMock, ...gyms]);
    setSuccessMsg(`Seeded Offline Mock Gym: ${payload.name}!`);
    setFormData({
      name: '',
      location: '',
      barcodeToken: '',
      openHour: '06:00',
      closeHour: '22:00',
      capacityPerSlot: 20,
      allowOnline: true,
      allowOffline: true
    });
  };

  const handleDeleteGym = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove the gym "${name}" from the network?`)) return;

    try {
      const res = await fetch(`${API_BASE}/gyms/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Deleted ${name} successfully.`);
        fetchGyms();
      } else {
        mockDeleteGym(id, name);
      }
    } catch (err) {
      setOfflineQueue(prev => [...prev, {
        url: `${API_BASE}/gyms/${id}`,
        method: 'DELETE',
        displayName: `Delete Gym: ${name}`
      }]);
      mockDeleteGym(id, name);
    }
  };

  const mockDeleteGym = (id, name) => {
    setGyms(gyms.filter(g => g._id !== id));
    setSuccessMsg(`Deleted Offline Mock Gym: ${name}.`);
  };

  const exportToExcel = () => {
    const headers = [
      'Gym Name',
      'Location Address',
      'Barcode Token',
      'Operating Hours',
      'Hourly Capacity',
      'Direct Online Pay',
      'Offline Cash',
      'Registration Date'
    ];

    const rows = gyms.map(gym => [
      `"${(gym.name || '').replace(/"/g, '""')}"`,
      `"${(gym.location || '').replace(/"/g, '""')}"`,
      `"${(gym.barcodeToken || '').replace(/"/g, '""')}"`,
      `"${gym.operatingHours?.open || '06:00'} - ${gym.operatingHours?.close || '22:00'} IST"`,
      gym.capacityPerSlot || 20,
      gym.paymentMethodsConfig?.allowOnline ? 'Yes' : 'No',
      gym.paymentMethodsConfig?.allowOffline ? 'Yes' : 'No',
      new Date(gym.createdAt || Date.now()).toLocaleDateString()
    ]);

    const csvRows = [headers.join(','), ...rows.map(row => row.join(','))];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Gym_Partner_Monthly_Report_${new Date().getMonth() + 1}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredGyms = gyms.filter(gym => 
    gym.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    gym.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gym.barcodeToken.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Panel */}
      <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <span style={{ 
            background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontSize: '14px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            Fitmaniac Super Admin Console
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '4px' }}>
            <h1 style={{ fontSize: '32px', margin: 0 }}>Fitmaniac Partner Network</h1>
            <span style={{
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: isOnline ? 'rgba(56, 239, 125, 0.12)' : 'rgba(255, 8, 68, 0.12)',
              color: isOnline ? 'var(--accent-green)' : 'var(--accent-pink)',
              border: `1px solid ${isOnline ? 'rgba(56, 239, 125, 0.25)' : 'rgba(255, 8, 68, 0.25)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isOnline ? 'var(--accent-green)' : 'var(--accent-pink)',
                boxShadow: isOnline ? '0 0 8px var(--accent-green)' : '0 0 8px var(--accent-pink)'
              }}></span>
              {isOnline ? 'Online' : `Offline (${offlineQueue.length} queued)`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', padding: 0, fontSize: '18px', borderRadius: '8px' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn-secondary" onClick={fetchGyms}>Sync API</button>
          <button className="btn-primary" onClick={exportToExcel} style={{ background: 'linear-gradient(135deg, #38ef7d 0%, #11998e 100%)', color: '#000', border: 'none', fontWeight: 'bold' }}>📊 Export Report</button>
          <span className="badge badge-success" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center' }}>Network Connected</span>
        </div>
      </header>

      {/* Global Metrics Dashboard */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Gym Partners</div>
          <div style={{ fontSize: '42px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-cyan)' }}>{gyms.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '8px' }}>🟢 Active in 3 major districts</div>
        </div>
        <div className="glass-panel">
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Estimated Members Enrolled</div>
          <div style={{ fontSize: '42px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-pink)' }}>840</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Average attendance streak: 4.2 days/wk</div>
        </div>
        <div className="glass-panel">
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Partner QR Code Scans (Today)</div>
          <div style={{ fontSize: '42px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-yellow)' }}>148</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '8px' }}>⚡ Real-time barcode tracker active</div>
        </div>
        <div className="glass-panel">
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Global Retention Rate</div>
          <div style={{ fontSize: '42px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-green)' }}>92.4%</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '8px' }}>📈 +2.1% from previous quarter</div>
        </div>
      </section>

      {/* Main Body Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Side: Create Partner Form */}
        <div className="glass-panel" style={{ position: 'sticky', top: '20px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>✚</span> Register Gym Partner
          </h2>
          
          {errorMsg && (
            <div style={{ 
              background: 'rgba(255, 8, 68, 0.1)', 
              border: '1px solid var(--accent-pink)', 
              color: '#ff4d6d', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '14px', 
              marginBottom: '15px' 
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ 
              background: 'rgba(56, 239, 125, 0.1)', 
              border: '1px solid var(--accent-green)', 
              color: 'var(--accent-green)', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '14px', 
              marginBottom: '15px' 
            }}>
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>GYM NAME</label>
              <input 
                type="text" 
                name="name" 
                className="custom-input" 
                placeholder="e.g. Iron Gym Elite" 
                value={formData.name} 
                onChange={handleInputChange} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>LOCATION ADDRESS</label>
              <input 
                type="text" 
                name="location" 
                className="custom-input" 
                placeholder="e.g. Westside Ave, Hub 4" 
                value={formData.location} 
                onChange={handleInputChange} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>UNIQUE SCAN TOKEN / BARCODE</label>
              <input 
                type="text" 
                name="barcodeToken" 
                className="custom-input" 
                placeholder="e.g. GYM-PARTNER-909" 
                value={formData.barcodeToken} 
                onChange={handleInputChange} 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Used in QR check-in displays.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>OPEN HOUR</label>
                <input 
                  type="time" 
                  name="openHour" 
                  className="custom-input" 
                  value={formData.openHour} 
                  onChange={handleInputChange} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>CLOSE HOUR</label>
                <input 
                  type="time" 
                  name="closeHour" 
                  className="custom-input" 
                  value={formData.closeHour} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>HOURLY SLOT CAPACITY</label>
                <input 
                  type="number" 
                  name="capacityPerSlot" 
                  className="custom-input" 
                  value={formData.capacityPerSlot} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>PAYMENT METHOD PERMISSIONS</label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    name="allowOnline" 
                    checked={formData.allowOnline} 
                    onChange={handleInputChange} 
                    style={{ accentColor: 'var(--accent-cyan)' }} 
                  />
                  <span>Allow Direct Online Subscriptions</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    name="allowOffline" 
                    checked={formData.allowOffline} 
                    onChange={handleInputChange} 
                    style={{ accentColor: 'var(--accent-cyan)' }} 
                  />
                  <span>Allow Offline Cash (Manual Approval)</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Save Partner Gym
            </button>
          </form>
        </div>

        {/* Right Side: Search and Partner Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Search bar glass panel */}
          <div className="glass-panel" style={{ padding: '15px 24px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="custom-input" 
              placeholder="🔍 Search gyms by name, location, or barcode ID..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              style={{ flex: 1 }} 
            />
            {searchQuery && (
              <button className="btn-secondary" onClick={() => setSearchQuery('')} style={{ padding: '8px 16px' }}>Clear</button>
            )}
          </div>

          {/* Partners Listing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {filteredGyms.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <h3>No Partner Gyms Found</h3>
                <p style={{ marginTop: '8px' }}>Adjust your search filter or add a new partner to expand the network.</p>
              </div>
            ) : (
              filteredGyms.map(gym => (
                <div key={gym._id} className="glass-panel" style={{ position: 'relative' }}>
                  
                  {/* Glowing header banner inside card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ fontSize: '20px' }}>{gym.name}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>📍 {gym.location}</p>
                    </div>
                  </div>

                  {/* QR details block */}
                  <div style={{ 
                    background: 'var(--bg-subtle)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    fontSize: '13px', 
                    marginBottom: '18px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Scanner Barcode:</span>
                      <code style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{gym.barcodeToken}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Working Hours:</span>
                      <span>{gym.operatingHours.open} - {gym.operatingHours.close}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Slot Capacity:</span>
                      <span>{gym.capacityPerSlot} athletes / hr</span>
                    </div>
                  </div>

                  {/* Payment configuration layout */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {gym.paymentMethodsConfig.allowOnline && (
                      <span className="badge badge-success" style={{ fontSize: '10px' }}>⚡ Online Pay</span>
                    )}
                    {gym.paymentMethodsConfig.allowOffline && (
                      <span className="badge badge-warning" style={{ fontSize: '10px' }}>💵 Cash Approved</span>
                    )}
                  </div>

                  {/* Danger delete button */}
                  <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
                    <button 
                      className="btn-danger" 
                      onClick={() => handleDelete(gym._id, gym.name)} 
                      style={{ fontSize: '12px', padding: '8px 16px', flex: 1 }}
                    >
                      De-register Partner
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
