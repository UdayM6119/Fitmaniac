import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api/client';

const DEMO_CHALLENGES = [
  {
    _id: 'ch-1',
    title: '🔥 CHALLENGE: HRX 15-Min S&C Circuit',
    description: 'Target: 3 Rounds for Time (Squats, Bench Press, Kettlebell swings)',
    isActive: true,
    leaderboard: [
      { customerId: '103', customerName: 'Marcus Dutt', timeString: '12:45', seconds: 765 },
      { customerId: '101', customerName: 'Rahul Sharma (You)', timeString: '13:12', seconds: 792 },
      { customerId: '102', customerName: 'Priya Patel', timeString: '14:05', seconds: 845 }
    ]
  }
];

const DEMO_CUSTOMERS = [
  {
    _id: '101',
    name: 'Rahul Sharma',
    email: 'rahul@gmail.com',
    phone: '+91 98765 43210',
    subscription: {
      planType: 'Yearly',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
      pricePaid: 12999,
      status: 'Active',
      paymentMethod: 'Online'
    },
    carryForwardDays: 5,
    selectedWorkoutSlot: { start: '06:00', end: '08:00' }
  },
  {
    _id: '102',
    name: 'Priya Patel',
    email: 'priya@gmail.com',
    phone: '+91 98765 43211',
    subscription: {
      planType: 'Monthly',
      startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      pricePaid: 1499,
      status: 'Expired',
      paymentMethod: 'Offline'
    },
    carryForwardDays: 0,
    selectedWorkoutSlot: { start: '18:00', end: '20:00' }
  },
  {
    _id: '103',
    name: 'Marcus Dutt',
    email: 'marcus.dutt@gmail.com',
    phone: '+91 98765 43212',
    subscription: {
      planType: 'Quarterly',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      pricePaid: 3999,
      status: 'Active',
      paymentMethod: 'Offline'
    },
    carryForwardDays: 2,
    selectedWorkoutSlot: { start: '08:00', end: '10:00' }
  }
];

const DEMO_CLASSES = [
  {
    _id: '201',
    title: 'PRO Zumba Masterclass',
    description: 'High-tempo dance aerobics workout session.',
    trainerName: "Sarah D'Souza",
    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    capacity: 25,
    enrolledCustomers: []
  },
  {
    _id: '202',
    title: 'HRX Strength & Conditioning',
    description: 'Olympic lifting and full-body metabolic conditioning.',
    trainerName: 'Coach Shayan',
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 75,
    capacity: 15,
    enrolledCustomers: []
  }
];

const INITIAL_POSTS = [
  {
    _id: 'post-1',
    customerName: 'Rahul Sharma',
    title: '🏋️ Who is up for a 6:30 AM strength session tomorrow?',
    content: 'Planning to hit heavy HRX Strength & Conditioning tomorrow morning in Koramangala. Looking for a workout partner to spot each other on bench press and squats!',
    isPinned: false
  },
  {
    _id: 'post-2',
    customerName: 'Marcus Dutt',
    title: '🥗 Carpool coordination for Zumba Masterclass',
    content: 'I have 3 empty seats in my car for the upcoming Zumba Special Masterclass this Wednesday. Let me know if anyone from HSR Layout wants a ride!',
    isPinned: false
  }
];

function App() {
  const [gymId, setGymId] = useState('777'); // Fixed demo Gym ID (Alpha Fitness Center)
  const [customers, setCustomers] = useState(() => {
    const cached = localStorage.getItem('fitmaniac_customers');
    return cached ? JSON.parse(cached) : DEMO_CUSTOMERS;
  });
  const [specialClasses, setSpecialClasses] = useState(() => {
    const cached = localStorage.getItem('fitmaniac_classes');
    return cached ? JSON.parse(cached) : DEMO_CLASSES;
  });
  const [challenges, setChallenges] = useState(() => {
    const cached = localStorage.getItem('fitmaniac_challenges');
    return cached ? JSON.parse(cached) : DEMO_CHALLENGES;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'classes' | 'community' | 'challenges' | 'poster' | 'gate'
  const [challengeForm, setChallengeForm] = useState({ title: '', description: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Gate Scanner States
  const [gateResult, setGateResult] = useState('');
  const [gateMessageTitle, setGateMessageTitle] = useState('');
  const [gateMessageBody, setGateMessageBody] = useState('Select an athlete and click Scan.');
  const [selectedScanUser, setSelectedScanUser] = useState('');

  // Offline Sync Queue States & Handlers
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const cached = localStorage.getItem('fitmaniac_client_queue');
    return cached ? JSON.parse(cached) : [];
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    localStorage.setItem('fitmaniac_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('fitmaniac_classes', JSON.stringify(specialClasses));
  }, [specialClasses]);

  useEffect(() => {
    localStorage.setItem('fitmaniac_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('fitmaniac_client_queue', JSON.stringify(offlineQueue));
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
            body: JSON.stringify(item.body)
          });
          const data = await res.json();
          if (data.success || res.status === 200 || res.status === 201) {
            successCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          console.log("Sync item failed: ", e);
          break;
        }
      }

      if (successCount > 0) {
        const remaining = queueCopy.slice(successCount);
        setOfflineQueue(remaining);
        setSuccessMsg(`Successfully synced ${successCount} pending offline operations with the server!`);
        fetchData();
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

  const playChimeTone = (freq, duration) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio Context not supported or blocked by user gesture");
    }
  };

  const handleSimulatedGateScan = () => {
    if (!selectedScanUser) {
      playChimeTone(150, 0.2);
      setGateResult('denied');
      setGateMessageTitle('NO ATHLETE SELECTED');
      setGateMessageBody('Please select an athlete from the list to scan.');
      return;
    }

    const athlete = customers.find(c => c._id === selectedScanUser);
    if (!athlete) {
      playChimeTone(150, 0.2);
      setGateResult('denied');
      setGateMessageTitle('ATHLETE NOT FOUND');
      setGateMessageBody('The selected athlete record is missing.');
      return;
    }

    const isActive = athlete.subscription.status === 'Active' && new Date(athlete.subscription.endDate) > new Date();
    
    if (!isActive && athlete.carryForwardDays <= 0) {
      playChimeTone(150, 0.2);
      setGateResult('denied');
      setGateMessageTitle('ACCESS DENIED');
      setGateMessageBody(`Subscription Expired / No Carry-Forward Days left for ${athlete.name}.`);
      return;
    }

    playChimeTone(880, 0.1);
    setTimeout(() => playChimeTone(1320, 0.15), 100);

    let updatedCarryForward = athlete.carryForwardDays;
    let message = '';
    
    if (!isActive && athlete.carryForwardDays > 0) {
      updatedCarryForward = athlete.carryForwardDays - 1;
      message = `${athlete.name} checked in using 1 carry-forward day. ${updatedCarryForward} days remaining.`;
      
      setCustomers(customers.map(c => {
        if (c._id === athlete._id) {
          return { ...c, carryForwardDays: updatedCarryForward };
        }
        return c;
      }));
    } else {
      message = `${athlete.name} checked in successfully. Expiry: ${new Date(athlete.subscription.endDate).toLocaleDateString()}`;
    }

    setGateResult('granted');
    setGateMessageTitle('ACCESS GRANTED');
    setGateMessageBody(message);
  };

  const resetGateScanner = () => {
    setGateResult('');
    setGateMessageTitle('');
    setGateMessageBody('Select an athlete and click Scan.');
    setSelectedScanUser('');
  };

  const [forumPosts, setForumPosts] = useState(INITIAL_POSTS);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  const handleAnnouncementSubmit = (e) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) return;
    
    const newAnnouncement = {
      _id: Date.now().toString(),
      customerName: '📢 Gym Desk Announcement',
      title: announcementForm.title,
      content: announcementForm.content,
      isPinned: true
    };
    
    setForumPosts([newAnnouncement, ...forumPosts]);
    setSuccessMsg(`Broadcasted Gym Pinned Announcement: ${announcementForm.title}!`);
    setAnnouncementForm({ title: '', content: '' });
  };

  const handleDeletePost = (postId, title) => {
    if (!window.confirm(`Are you sure you want to remove the discussion thread: "${title}"?`)) return;
    setForumPosts(forumPosts.filter(p => p._id !== postId));
    setSuccessMsg(`Moderated: Removed thread "${title}".`);
  };

  // Forms State
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    planType: 'Monthly',
    pricePaid: 1499,
    paymentMethod: 'Offline',
    slotStart: '08:00',
    slotEnd: '10:00',
    carryForwardDays: 0
  });

  const [classForm, setClassForm] = useState({
    title: '',
    description: '',
    trainerName: '',
    dateTime: '',
    durationMinutes: 60,
    capacity: 20
  });

  useEffect(() => {
    fetchData();
  }, [gymId]);

  const fetchData = async () => {
    try {
      const resCust = await fetch(`${API_BASE}/customers?gymId=${gymId}`);
      const dataCust = await resCust.json();
      if (dataCust.success) setCustomers(dataCust.customers);

      const resClass = await fetch(`${API_BASE}/special-classes?gymId=${gymId}`);
      const dataClass = await resClass.json();
      if (dataClass.success) setSpecialClasses(dataClass.specialClasses);

      const resChal = await fetch(`${API_BASE}/challenges?gymId=${gymId}`);
      const dataChal = await resChal.json();
      if (dataChal.success) setChallenges(dataChal.challenges);
    } catch (e) {
      console.log('Using mockup customer data as local backend API is syncing.');
    }
  };

  const handleChallengeSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!challengeForm.title || !challengeForm.description) {
      setErrorMsg('Please specify Challenge Title and Circuit Description.');
      return;
    }

    const payload = {
      gymId,
      title: challengeForm.title,
      description: challengeForm.description
    };

    try {
      const res = await fetch(`${API_BASE}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Published Gym Segment Challenge: ${challengeForm.title}!`);
        setChallengeForm({ title: '', description: '' });
        fetchData();
      } else {
        mockAddChallenge(payload);
      }
    } catch (err) {
      setOfflineQueue(prev => [...prev, {
        url: `${API_BASE}/challenges`,
        method: 'POST',
        body: payload,
        displayName: `Create Challenge: ${payload.title}`
      }]);
      mockAddChallenge(payload);
    }
  };

  const mockAddChallenge = (payload) => {
    const newMock = {
      _id: Date.now().toString(),
      title: payload.title,
      description: payload.description,
      isActive: true,
      leaderboard: []
    };
    setChallenges([newMock, ...challenges]);
    setSuccessMsg(`Published Offline Mock Gym Challenge: ${payload.title}!`);
    setChallengeForm({ title: '', description: '' });
  };

  const handleDeleteChallenge = async (challengeId, title) => {
    if (!window.confirm(`Are you sure you want to remove this Segment Challenge: "${title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/challenges/${challengeId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Removed Challenge: "${title}" successfully.`);
        fetchData();
      } else {
        mockDeleteChallenge(challengeId, title);
      }
    } catch (err) {
      mockDeleteChallenge(challengeId, title);
    }
  };

  const mockDeleteChallenge = (challengeId, title) => {
    setChallenges(challenges.filter(c => c._id !== challengeId));
    setSuccessMsg(`Removed Offline Mock Challenge: "${title}".`);
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!customerForm.name || !customerForm.email || !customerForm.phone) {
      setErrorMsg('Please input Name, Email and Phone details.');
      return;
    }

    const carryDays = customerForm.planType === 'Yearly' ? Math.min(30, parseInt(customerForm.carryForwardDays) || 0) : 0;
    const payload = {
      gymId,
      name: customerForm.name,
      email: customerForm.email,
      phone: customerForm.phone,
      subscription: {
        planType: customerForm.planType,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + (customerForm.planType === 'Yearly' ? 360 : customerForm.planType === 'Quarterly' ? 90 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        pricePaid: parseFloat(customerForm.pricePaid),
        status: 'Active',
        paymentMethod: customerForm.paymentMethod
      },
      carryForwardDays: carryDays,
      selectedWorkoutSlot: {
        start: customerForm.slotStart,
        end: customerForm.slotEnd
      }
    };

    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Registered Customer: ${customerForm.name} successfully!`);
        resetCustomerForm();
        fetchData();
      } else {
        mockAddCustomer(payload);
      }
    } catch (err) {
      setOfflineQueue(prev => [...prev, {
        url: `${API_BASE}/customers`,
        method: 'POST',
        body: payload,
        displayName: `Register Athlete: ${payload.name}`
      }]);
      mockAddCustomer(payload);
    }
  };

  const mockAddCustomer = (payload) => {
    const newMock = {
      _id: Date.now().toString(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      subscription: payload.subscription,
      carryForwardDays: payload.carryForwardDays || 0,
      selectedWorkoutSlot: payload.selectedWorkoutSlot
    };
    setCustomers([newMock, ...customers]);
    setSuccessMsg(`Seeded Offline Mock Customer: ${payload.name}!`);
    resetCustomerForm();
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      name: '',
      email: '',
      phone: '',
      planType: 'Monthly',
      pricePaid: 1499,
      paymentMethod: 'Offline',
      slotStart: '08:00',
      slotEnd: '10:00',
      carryForwardDays: 0
    });
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!classForm.title || !classForm.trainerName || !classForm.dateTime) {
      setErrorMsg('Please specify Class Title, Trainer Name and Scheduled Date.');
      return;
    }

    const payload = {
      gymId,
      ...classForm,
      dateTime: new Date(classForm.dateTime).toISOString()
    };

    try {
      const res = await fetch(`${API_BASE}/special-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Scheduled Class: ${classForm.title}!`);
        resetClassForm();
        fetchData();
      } else {
        mockAddClass(payload);
      }
    } catch (err) {
      setOfflineQueue(prev => [...prev, {
        url: `${API_BASE}/special-classes`,
        method: 'POST',
        body: payload,
        displayName: `Schedule Class: ${payload.title}`
      }]);
      mockAddClass(payload);
    }
  };

  const mockAddClass = (payload) => {
    const newMock = {
      _id: Date.now().toString(),
      ...payload,
      enrolledCustomers: []
    };
    setSpecialClasses([newMock, ...specialClasses]);
    setSuccessMsg(`Scheduled Offline Class: ${payload.title}!`);
    resetClassForm();
  };

  const resetClassForm = () => {
    setClassForm({
      title: '',
      description: '',
      trainerName: '',
      dateTime: '',
      durationMinutes: 60,
      capacity: 20
    });
  };

  // Manual Subscription Renewal (Offline Pay Trigger)
  const handleApproveRenewal = async (customerId, name, planType) => {
    const defaultPrice = planType === 'Yearly' ? 12999 : planType === 'Quarterly' ? 3999 : 1499;
    const customPriceInput = window.prompt(`Renewing subscription for ${name} (${planType}).\n\nEnter subscription rate in ₹:`, defaultPrice);
    if (customPriceInput === null) return; // User clicked Cancel
    const pricePaid = parseFloat(customPriceInput) || 0;

    let carryForwardDays = 0;
    if (planType === 'Yearly') {
      const carryInput = window.prompt(`Enter carry-forward days to assign (Max 30):`, '0');
      if (carryInput !== null) {
        carryForwardDays = Math.min(30, Math.max(0, parseInt(carryInput) || 0));
      }
    }

    const payload = { planType, pricePaid, carryForwardDays };
    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}/renew-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Renewed offline payment subscription for ${name} at ₹${pricePaid.toLocaleString('en-IN')}!`);
        fetchData();
      } else {
        mockRenewCustomer(customerId, planType, pricePaid, carryForwardDays);
      }
    } catch (e) {
      setOfflineQueue(prev => [...prev, {
        url: `${API_BASE}/customers/${customerId}/renew-subscription`,
        method: 'POST',
        body: payload,
        displayName: `Renew Membership: ${name} (${planType})`
      }]);
      mockRenewCustomer(customerId, planType, pricePaid, carryForwardDays);
    }
  };

  const mockRenewCustomer = (customerId, planType, price, carryForwardDays) => {
    const nextEndDate = new Date();
    nextEndDate.setMonth(nextEndDate.getMonth() + (planType === 'Yearly' ? 12 : planType === 'Quarterly' ? 3 : 1));
    const carryDays = planType === 'Yearly' ? Math.min(30, carryForwardDays || 0) : 0;

    setCustomers(customers.map(c => {
      if (c._id === customerId) {
        return {
          ...c,
          subscription: {
            ...c.subscription,
            status: 'Active',
            planType,
            pricePaid: price,
            startDate: new Date().toISOString(),
            endDate: nextEndDate.toISOString(),
            paymentMethod: 'Offline'
          },
          carryForwardDays: carryDays
        };
      }
      return c;
    }));
    setSuccessMsg(`Renewed Cash Subscription (Offline Preview): ${customers.find(c => c._id === customerId)?.name}`);
  };

  const exportMembersToExcel = () => {
    const headers = [
      'Athlete Name',
      'Email Address',
      'Contact Phone',
      'Subscription Plan',
      'Price Paid (INR)',
      'Payment Method',
      'Status',
      'Carry-Forward Days',
      'Slot Timing',
      'Start Date',
      'Expiry Date'
    ];

    const rows = customers.map(cust => [
      `"${(cust.name || '').replace(/"/g, '""')}"`,
      `"${(cust.email || '').replace(/"/g, '""')}"`,
      `"${(cust.phone || '').replace(/"/g, '""')}"`,
      `"${cust.subscription?.planType || 'Monthly'}"`,
      cust.subscription?.pricePaid || 0,
      `"${cust.subscription?.paymentMethod || 'Offline'}"`,
      `"${cust.subscription?.status || 'Active'}"`,
      cust.carryForwardDays || 0,
      `"${cust.selectedWorkoutSlot?.start || '08:00'} - ${cust.selectedWorkoutSlot?.end || '10:00'}"`,
      new Date(cust.subscription?.startDate || Date.now()).toLocaleDateString(),
      new Date(cust.subscription?.endDate || Date.now()).toLocaleDateString()
    ]);

    const csvRows = [headers.join(','), ...rows.map(row => row.join(','))];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Athlete_Members_Monthly_Report_${new Date().getMonth() + 1}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPosterImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');

    // 1. Draw premium gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, 1200);
    grad.addColorStop(0, '#0a0e17');
    grad.addColorStop(0.5, '#121a2c');
    grad.addColorStop(1, '#070b13');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 1200);

    // Glowing circles
    ctx.fillStyle = 'rgba(0, 242, 254, 0.04)';
    ctx.beginPath();
    ctx.arc(100, 100, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 8, 68, 0.03)';
    ctx.beginPath();
    ctx.arc(700, 1100, 300, 0, Math.PI * 2);
    ctx.fill();

    // 2. Borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 15;
    ctx.strokeRect(30, 30, 740, 1140);

    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2;
    ctx.strokeRect(45, 45, 710, 1110);

    // 3. Brand Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('FITMANIAC', 400, 150);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#00f2fe';
    ctx.fillText('INDIAN CONNECTED FITNESS NETWORK', 400, 190);

    // 4. Poster Title
    ctx.font = 'bold 56px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SCAN TO CHECK-IN', 400, 320);
    
    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Open your Fitmaniac App and scan code at the gate', 400, 370);

    // 5. White barcode box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(150, 450, 500, 250);

    // Barcode lines pattern
    ctx.fillStyle = '#000000';
    const code = 'fitfreak_001';
    let xpos = 180;
    ctx.fillRect(xpos, 470, 10, 210); // Start marker
    xpos += 15;
    ctx.fillRect(xpos, 470, 5, 210);
    xpos += 10;
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const w1 = (charCode % 3) + 2;
      const space = (charCode % 4) + 4;
      ctx.fillRect(xpos, 470, w1 * 2, 210);
      xpos += (w1 * 2) + (space * 2);
    }
    ctx.fillRect(xpos, 470, 10, 210); // End marker

    // Barcode code label
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(code.toUpperCase(), 400, 735);

    // 6. Gym details
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Fitmaniac Center Koramangala', 400, 840);
    
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('100 Feet Road, Koramangala, Bangalore', 400, 880);

    // 7. Footer text
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#38ef7d';
    ctx.fillText('⚡ Entrance gate opens instantly on scan', 400, 980);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Absence days are rolled over to carry-forward (Max 30 days, Yearly members only)', 400, 1030);

    // 8. Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Fitmaniac_Gate_Poster_${code}.png`;
    link.href = dataUrl;
    link.click();
  };

  const filteredCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cust.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cust.phone.includes(searchQuery)
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Panel */}
      <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <span style={{ 
            background: 'linear-gradient(135deg, #00f2fe 0%, #38ef7d 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontSize: '14px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            Fitmaniac Partner Panel
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '4px' }}>
            <h1 style={{ fontSize: '32px', margin: 0 }}>Fitmaniac Center Koramangala</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', padding: 0, fontSize: '18px', borderRadius: '8px' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button 
            className="btn-secondary"
            onClick={exportMembersToExcel}
            style={{ minWidth: '150px', background: 'linear-gradient(135deg, #38ef7d 0%, #11998e 100%)', color: '#000', border: 'none', fontWeight: 'bold' }}
          >
            📊 Export Members
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'customers' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('customers'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ minWidth: '150px' }}
          >
            🏋️ Members List
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'gate' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('gate'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ minWidth: '150px' }}
          >
            🚪 Gate Scanner
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'classes' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('classes'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ minWidth: '150px' }}
          >
            📅 Special Classes
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'community' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('community'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ minWidth: '150px' }}
          >
            💬 Community Mod
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'challenges' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('challenges'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ minWidth: '150px' }}
          >
            🏃 Challenges Mod
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'poster' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('poster'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ minWidth: '150px' }}
          >
            🖨️ Gate Poster
          </button>
        </div>
      </header>

      {/* Analytics widgets */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-panel">
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Registered Members</div>
          <div style={{ fontSize: '42px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-cyan)' }}>{customers.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Active: {customers.filter(c => c.subscription.status === 'Active').length} | Expired: {customers.filter(c => c.subscription.status === 'Expired').length}
          </div>
        </div>
        <div className="glass-panel">
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Check-Ins (Today)</div>
          <div style={{ fontSize: '42px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-green)' }}>24</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '8px' }}>⚡ 4 athletes checked-in currently</div>
        </div>
        <div className="glass-panel">
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Special Masterclasses</div>
          <div style={{ fontSize: '42px', fontWeight: '800', marginTop: '10px', color: 'var(--accent-yellow)' }}>{specialClasses.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '8px' }}>Next session: Zumba in 2 days</div>
        </div>
      </section>

      {/* Status Notifications */}
      {successMsg && (
        <div className="glass-panel" style={{ 
          background: 'rgba(56, 239, 125, 0.1)', 
          borderColor: 'var(--accent-green)', 
          color: 'var(--accent-green)', 
          padding: '16px', 
          borderRadius: '12px', 
          marginBottom: '30px' 
        }}>
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="glass-panel" style={{ 
          background: 'rgba(255, 8, 68, 0.1)', 
          borderColor: 'var(--accent-pink)', 
          color: '#ff4d6d', 
          padding: '16px', 
          borderRadius: '12px', 
          marginBottom: '30px' 
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Conditional Tabs render */}
      {activeTab === 'customers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Customer Register Card */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>🏋️ Register New Athlete</h2>
            
            <form onSubmit={handleCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>FULL NAME</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="e.g. Rahul Sharma" 
                  value={customerForm.name} 
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  className="custom-input" 
                  placeholder="e.g. rahul@gmail.com" 
                  value={customerForm.email} 
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>CONTACT PHONE</label>
                <input 
                  type="tel" 
                  className="custom-input" 
                  placeholder="e.g. +91 98765 43210" 
                  value={customerForm.phone} 
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>SUBSCRIPTION PLAN</label>
                  <select 
                    className="custom-input" 
                    value={customerForm.planType} 
                    onChange={(e) => {
                      const type = e.target.value;
                      const price = type === 'Yearly' ? 12999 : type === 'Quarterly' ? 3999 : 1499;
                      setCustomerForm({ ...customerForm, planType: type, pricePaid: price });
                    }}
                    style={{ background: 'var(--bg-dark)' }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>PAYMENT METHOD</label>
                  <select 
                    className="custom-input" 
                    value={customerForm.paymentMethod} 
                    onChange={(e) => setCustomerForm({ ...customerForm, paymentMethod: e.target.value })}
                    style={{ background: 'var(--bg-dark)' }}
                  >
                    <option value="Offline">Offline Cash / UPI</option>
                    <option value="Online">Online UPI / Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>PRICE PAID (₹) — EDITABLE FOR CUSTOM RATES</label>
                <input 
                  type="number" 
                  className="custom-input" 
                  placeholder="e.g. 1499" 
                  value={customerForm.pricePaid} 
                  onChange={(e) => setCustomerForm({ ...customerForm, pricePaid: parseFloat(e.target.value) || 0 })} 
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                  CARRY-FORWARD DAYS (Max 30, Yearly only)
                </label>
                <input 
                  type="number" 
                  className="custom-input" 
                  min="0"
                  max="30"
                  placeholder={customerForm.planType === 'Yearly' ? "e.g. 10 (Max 30)" : "Disabled for Monthly/Quarterly plans"} 
                  disabled={customerForm.planType !== 'Yearly'}
                  value={customerForm.planType === 'Yearly' ? customerForm.carryForwardDays : ''} 
                  onChange={(e) => setCustomerForm({ 
                    ...customerForm, 
                    carryForwardDays: Math.min(30, Math.max(0, parseInt(e.target.value) || 0)) 
                  })} 
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  {customerForm.planType === 'Yearly' 
                    ? "Allows athlete to check in using unused days after pass expiration." 
                    : "⚠️ Restrained: Only yearly members get carryforward days."}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>SLOT START TIME</label>
                  <input 
                    type="time" 
                    className="custom-input" 
                    value={customerForm.slotStart} 
                    onChange={(e) => setCustomerForm({ ...customerForm, slotStart: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>SLOT END TIME</label>
                  <input 
                    type="time" 
                    className="custom-input" 
                    value={customerForm.slotEnd} 
                    onChange={(e) => setCustomerForm({ ...customerForm, slotEnd: e.target.value })} 
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Add Customer Profile
              </button>
            </form>
          </div>

          {/* Customer list and offline approvals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '15px 24px' }}>
              <input 
                type="text" 
                className="custom-input" 
                placeholder="🔍 Search athletes by name, email, or contact number..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {filteredCustomers.map(cust => {
                const isActive = cust.subscription.status === 'Active' && new Date(cust.subscription.endDate) > new Date();
                return (
                  <div key={cust._id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '18px' }}>{cust.name}</h3>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        ✉️ {cust.email} | 📞 {cust.phone}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>Plan: <strong style={{ color: 'var(--text-main)' }}>{cust.subscription.planType} (₹{cust.subscription.pricePaid?.toLocaleString('en-IN') || '0'} via {cust.subscription.paymentMethod})</strong></span>
                        <span>Carry-forward: <strong style={{ color: 'var(--accent-cyan)' }}>{cust.carryForwardDays} days</strong></span>
                        <span>Slot: <strong style={{ color: 'var(--accent-yellow)' }}>{cust.selectedWorkoutSlot.start} - {cust.selectedWorkoutSlot.end}</strong></span>
                      </div>
                      
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Expiry Date: {new Date(cust.subscription.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {!isActive && (
                        <button 
                          className="btn-primary" 
                          onClick={() => handleApproveRenewal(cust._id, cust.name, cust.subscription.planType)}
                          style={{ fontSize: '12px', padding: '8px 16px' }}
                        >
                          💵 Cash Received: Renew
                        </button>
                      )}
                      {isActive && (
                        <span style={{ fontSize: '11px', color: 'var(--accent-green)', textAlign: 'right', fontWeight: 'bold' }}>
                          ✓ Subscription Verified
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'classes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Add Special Class Form */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>📅 Schedule Special Class</h2>
            
            <form onSubmit={handleClassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>CLASS TITLE</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="e.g. Crossfit / Zumba Masterclass" 
                  value={classForm.title} 
                  onChange={(e) => setClassForm({ ...classForm, title: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>DESCRIPTION</label>
                <textarea 
                  className="custom-input" 
                  placeholder="Describe workout target, difficulty levels..." 
                  value={classForm.description} 
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>TRAINER NAME</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="e.g. Sarah Connor" 
                  value={classForm.trainerName} 
                  onChange={(e) => setClassForm({ ...classForm, trainerName: e.target.value })} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>DATE & TIME</label>
                  <input 
                    type="datetime-local" 
                    className="custom-input" 
                    value={classForm.dateTime} 
                    onChange={(e) => setClassForm({ ...classForm, dateTime: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>DURATION (MIN)</label>
                  <input 
                    type="number" 
                    className="custom-input" 
                    value={classForm.durationMinutes} 
                    onChange={(e) => setClassForm({ ...classForm, durationMinutes: parseInt(e.target.value) })} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>SLOT ATHLETE CAPACITY</label>
                <input 
                  type="number" 
                  className="custom-input" 
                  value={classForm.capacity} 
                  onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) })} 
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Schedule & Broadcast Class
              </button>
            </form>
          </div>

          {/* Classes list dashboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '22px' }}>Upcoming Scheduled Classes</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {specialClasses.map(cls => (
                <div key={cls._id} className="glass-panel">
                  <span className="badge badge-success" style={{ fontSize: '9px', marginBottom: '8px' }}>Upcoming Session</span>
                  <h3 style={{ fontSize: '20px' }}>{cls.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{cls.description}</p>
                  
                  <div style={{ 
                    background: 'var(--bg-subtle)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    fontSize: '13px', 
                    margin: '15px 0' 
                  }}>
                    <div>⚡ Trainer: <strong style={{ color: 'var(--text-main)' }}>{cls.trainerName}</strong></div>
                    <div>🕒 Date: <strong>{new Date(cls.dateTime).toLocaleString()}</strong></div>
                    <div>⏳ Duration: <strong>{cls.durationMinutes} minutes</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid var(--border-glass)', paddingTop: '6px' }}>
                      <span>Enrolled Athletes:</span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                        {cls.enrolledCustomers.length} / {cls.capacity} spots
                      </span>
                    </div>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    📢 Synchronized dynamically to all customer apps
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'community' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Left Column: Post Announcement */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>📢 Broadcast Gym Announcement</h2>
            
            <form onSubmit={handleAnnouncementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ANNOUNCEMENT TITLE</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="e.g. Squat Rack Maintenance on Sunday" 
                  value={announcementForm.title} 
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ANNOUNCEMENT CONTENT</label>
                <textarea 
                  className="custom-input" 
                  placeholder="Describe maintenance timings, special announcements..." 
                  value={announcementForm.content} 
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                📌 Pin & Broadcast Announcement
              </button>
            </form>
          </div>

          {/* Right Column: Moderate Threads */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '22px' }}>Local Gym Community Board (Moderator View)</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {forumPosts.map(post => (
                <div key={post._id} className="glass-panel" style={{ borderLeft: post.isPinned ? '4px solid var(--accent-yellow)' : '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, paddingRight: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge" style={{ 
                        background: post.isPinned ? 'rgba(246, 211, 101, 0.15)' : 'rgba(0, 242, 254, 0.15)', 
                        color: post.isPinned ? 'var(--accent-yellow)' : 'var(--accent-cyan)' 
                      }}>
                        {post.isPinned ? '📌 PINNED ANNOUNCEMENT' : '👤 MEMBER POST'}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-muted)' }}>by {post.customerName}</strong>
                    </div>
                    <h3 style={{ fontSize: '18px', marginTop: '8px' }}>{post.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '18px' }}>{post.content}</p>
                  </div>
                  <button 
                    className="btn-danger" 
                    onClick={() => handleDeletePost(post._id, post.title)}
                    style={{ fontSize: '11px', padding: '8px 16px', width: 'auto', flexShrink: 0 }}
                  >
                    🗑 Remove Post
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'challenges' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Create Challenge Form */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>🏃 Publish Segment Challenge</h2>
            
            <form onSubmit={handleChallengeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>CHALLENGE TITLE</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="e.g. HRX 15-Min S&C Circuit" 
                  value={challengeForm.title} 
                  onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>CIRCUIT DETAILS & TARGETS</label>
                <textarea 
                  className="custom-input" 
                  placeholder="Describe circuit movements, round targets, kettlebell weights..." 
                  value={challengeForm.description} 
                  onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })} 
                  style={{ minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                🚀 Launch Segment Challenge
              </button>
            </form>
          </div>

          {/* Active Challenges List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '22px' }}>Active Gym Physical Segments Leaderboards</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {challenges.map(chal => (
                <div key={chal._id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge badge-success" style={{ fontSize: '9px', marginBottom: '8px' }}>Active Local Segment</span>
                      <h3 style={{ fontSize: '20px' }}>{chal.title}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{chal.description}</p>
                    </div>
                    <button 
                      className="btn-danger" 
                      onClick={() => handleDeleteChallenge(chal._id, chal.title)}
                      style={{ fontSize: '11px', padding: '6px 12px', width: 'auto' }}
                    >
                      🗑 Remove Segment
                    </button>
                  </div>

                  {/* Leaderboard entries */}
                  <div style={{ 
                    background: 'var(--bg-subtle)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '8px', 
                    padding: '12px'
                  }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '10px' }}>🏆 Current Athlete Leaderboard Rankings</h4>
                    {chal.leaderboard && chal.leaderboard.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {chal.leaderboard.map((entry, idx) => (
                          <div 
                            key={entry.customerId || idx} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              borderBottom: idx < chal.leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none', 
                              paddingBottom: '4px',
                              fontSize: '13px'
                            }}
                          >
                            <span>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏃'} {idx + 1}. {entry.customerName}
                            </span>
                            <strong style={{ color: idx === 0 ? 'var(--accent-yellow)' : 'var(--text-bright)' }}>⏱️ {entry.timeString}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                        No athlete attempts logged yet today. Invite athletes to log times in their app!
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'poster' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }}>
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>🖨️ Gate Check-in Barcode Poster</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '20px' }}>
              Download and print this high-resolution poster to place it at your Gym's entrance gate. Members will scan this code using their Fitmaniac app to check in and check out instantly!
            </p>
            <button 
              className="btn-primary" 
              onClick={downloadPosterImage}
              style={{ width: '100%', padding: '14px 28px', fontSize: '16px' }}
            >
              📥 Download Gate Poster (PNG)
            </button>
            <div style={{ marginTop: '15px', fontSize: '11px', color: 'var(--text-muted)' }}>
              Generates a standard 800x1200 high-resolution printable layout.
            </div>
          </div>

          {/* Visual Poster Preview */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div id="poster-preview-card" style={{
              width: '320px',
              height: '480px',
              background: 'linear-gradient(135deg, #0a0e17 0%, #121a2c 100%)',
              border: '4px solid #00f2fe',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 15px 40px rgba(0,242,254,0.15)',
              position: 'relative'
            }}>
              <div>
                <span style={{ fontSize: '22px', fontWeight: '800', color: '#fff', letterSpacing: '2px' }}>FITMANIAC</span>
                <span style={{ fontSize: '8px', color: '#00f2fe', display: 'block', fontWeight: 'bold' }}>CONNECTED GYM NETWORK</span>
              </div>

              <div style={{ margin: '20px 0' }}>
                <h3 style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>SCAN TO CHECK-IN</h3>
                <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>Use Fitmaniac App at the entrance gate</p>
              </div>

              {/* Barcode visual preview */}
              <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* stylized barcode bars */}
                <div style={{ display: 'flex', gap: '2px', height: '60px', alignItems: 'center' }}>
                  <div style={{ width: '3px', height: '100%', background: '#000' }} />
                  <div style={{ width: '1px', height: '100%', background: '#000' }} />
                  <div style={{ width: '4px', height: '100%', background: '#000' }} />
                  <div style={{ width: '2px', height: '100%', background: '#000' }} />
                  <div style={{ width: '1px', height: '100%', background: '#000' }} />
                  <div style={{ width: '3px', height: '100%', background: '#000' }} />
                  <div style={{ width: '2px', height: '100%', background: '#000' }} />
                  <div style={{ width: '4px', height: '100%', background: '#000' }} />
                  <div style={{ width: '1px', height: '100%', background: '#000' }} />
                  <div style={{ width: '3px', height: '100%', background: '#000' }} />
                </div>
                <span style={{ fontSize: '10px', color: '#111827', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '6px' }}>FITFREAK_001</span>
              </div>

              <div>
                <h4 style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>Fitmaniac Center Koramangala</h4>
                <p style={{ fontSize: '8px', color: '#9ca3af' }}>100 Feet Road, Koramangala, Bangalore</p>
              </div>

              <div style={{ fontSize: '7px', color: '#38ef7d', fontWeight: 'bold' }}>
                ⚡ Entrance gate opens instantly on scan
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Gate Scanner Simulator Screen */}
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>🚪 Reception Entrance Gate Scanner</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Simulate members scanning their Dynamic Security QR codes at the gate terminal.
            </p>

            {/* Simulated Terminal Screen */}
            <div id="terminal-screen" style={{
              width: '100%',
              minHeight: '220px',
              background: '#060b13',
              border: `2px solid ${
                gateResult === 'granted' ? 'var(--accent-green)' :
                gateResult === 'denied' ? 'var(--accent-pink)' : 'var(--accent-cyan)'
              }`,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '20px',
              boxShadow: gateResult === 'granted' ? '0 0 20px rgba(56, 239, 125, 0.3)' :
                         gateResult === 'denied' ? '0 0 20px rgba(255, 8, 68, 0.3)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              <div id="terminal-status-indicator" style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: gateResult === 'granted' ? 'var(--accent-green)' : 'var(--accent-pink)', 
                marginBottom: '15px',
                textTransform: 'uppercase'
              }}>
                ● {gateResult === 'granted' ? 'GATE OPEN / UNLOCKED' : 'GATE CLOSED / LOCKED'}
              </div>
              
              <div id="terminal-display-content" style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>
                  {gateResult === 'granted' ? '🔓' : gateResult === 'denied' ? '🚫' : '🔒'}
                </span>
                {gateMessageTitle && (
                  <h4 style={{ 
                    fontSize: '16px', 
                    color: gateResult === 'granted' ? 'var(--accent-green)' : 'var(--accent-pink)', 
                    fontWeight: 'bold', 
                    marginBottom: '8px' 
                  }}>
                    {gateMessageTitle}
                  </h4>
                )}
                <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '18px' }}>
                  {gateMessageBody}
                </p>
              </div>
            </div>

            {/* Select Athlete to Scan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>SELECT ATHLETE MEMBER TO SIMULATE SCAN</label>
              <select
                className="custom-input"
                value={selectedScanUser}
                onChange={(e) => setSelectedScanUser(e.target.value)}
                style={{ background: 'var(--bg-dark)' }}
              >
                <option value="">-- Select Athlete --</option>
                {customers.map(cust => (
                  <option key={cust._id} value={cust._id}>
                    {cust.name} ({cust.subscription.planType} - {cust.subscription.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Scanner controls */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-primary" 
                onClick={handleSimulatedGateScan} 
                style={{ flex: 2, padding: '14px' }}
              >
                📷 Scan Phone QR Pass
              </button>
              <button 
                className="btn-secondary" 
                onClick={resetGateScanner} 
                style={{ flex: 1, padding: '14px' }}
              >
                🔄 Reset Terminal
              </button>
            </div>
          </div>

          {/* Interactive Live Pass Share Doughnut SVG Chart Card */}
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>📊 Live Pass Subscription share</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '25px' }}>
              Live distribution of membership types among currently registered athletes in this center.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }}></span>
                    <span style={{ fontSize: '14px' }}>
                      Yearly (<strong>{customers.filter(c => c.subscription.planType === 'Yearly').length}</strong>)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-yellow)' }}></span>
                    <span style={{ fontSize: '14px' }}>
                      Quarterly (<strong>{customers.filter(c => c.subscription.planType === 'Quarterly').length}</strong>)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-pink)' }}></span>
                    <span style={{ fontSize: '14px' }}>
                      Monthly (<strong>{customers.filter(c => c.subscription.planType === 'Monthly').length}</strong>)
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic SVG Doughnut Chart */}
              {(() => {
                const yearlyCount = customers.filter(c => c.subscription.planType === 'Yearly').length;
                const quarterlyCount = customers.filter(c => c.subscription.planType === 'Quarterly').length;
                const monthlyCount = customers.filter(c => c.subscription.planType === 'Monthly').length;
                const total = yearlyCount + quarterlyCount + monthlyCount || 1;
                
                const yearlyPct = Math.round((yearlyCount / total) * 100);
                const quarterlyPct = Math.round((quarterlyCount / total) * 100);
                const monthlyPct = Math.round((monthlyCount / total) * 100);
                
                return (
                  <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                    <svg width="140" height="140" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      {/* Background circle */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="3" />
                      
                      {/* Yearly segment */}
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="15.915" 
                        fill="none" 
                        stroke="var(--accent-cyan)" 
                        strokeWidth="3.5" 
                        strokeDasharray={`${yearlyPct} ${100 - yearlyPct}`} 
                        strokeDashoffset="0" 
                        style={{ transition: 'stroke-dasharray 0.3s ease' }}
                      />
                      
                      {/* Quarterly segment */}
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="15.915" 
                        fill="none" 
                        stroke="var(--accent-yellow)" 
                        strokeWidth="3.5" 
                        strokeDasharray={`${quarterlyPct} ${100 - quarterlyPct}`} 
                        strokeDashoffset={`-${yearlyPct}`} 
                        style={{ transition: 'stroke-dasharray 0.3s ease' }}
                      />

                      {/* Monthly segment */}
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="15.915" 
                        fill="none" 
                        stroke="var(--accent-pink)" 
                        strokeWidth="3.5" 
                        strokeDasharray={`${monthlyPct} ${100 - monthlyPct}`} 
                        strokeDashoffset={`-${yearlyPct + quarterlyPct}`} 
                        style={{ transition: 'stroke-dasharray 0.3s ease' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-bright)' }}>{total}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Members</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default App;
