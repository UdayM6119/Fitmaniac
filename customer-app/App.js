import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Modal, 
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const BACKEND_BASE = 'http://localhost:5000/api/customer';

// Mock/Diagnostic Fallback Customer Account
const FALLBACK_USER = {
  id: 'rahul-fallback-id',
  name: 'Rahul Sharma',
  email: 'rahul@gmail.com',
  phone: '+91 98765 43210',
  gymId: { name: 'Fitmaniac Center Koramangala' },
  carryForwardDays: 5,
  subscription: {
    planType: 'Yearly',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
    pricePaid: 12999,
    status: 'Active',
    paymentMethod: 'Online'
  },
  selectedWorkoutSlot: { start: '06:00 AM', end: '08:00 AM' }
};

const MOCK_CHALLENGES = [
  {
    _id: 'ch-1',
    title: '🔥 CHALLENGE: HRX 15-Min S&C Circuit',
    description: 'Target: 3 Rounds for Time (Squats, Bench Press, Kettlebell swings)',
    isActive: true,
    leaderboard: [
      { customerId: '103', customerName: 'Marcus Dutt', timeString: '12:45', seconds: 765 },
      { customerId: 'rahul-fallback-id', customerName: 'Rahul Sharma (You)', timeString: '13:12', seconds: 792 },
      { customerId: '102', customerName: 'Priya Patel', timeString: '14:05', seconds: 845 }
    ]
  }
];

const MOCK_SPECIAL_CLASSES = [
  { id: '1', title: 'PRO Zumba Masterclass', trainer: "Sarah D'Souza", time: 'Tomorrow 09:00 AM', enrolled: false, spots: '4 spots left' },
  { id: '2', title: 'HRX Strength & Conditioning', trainer: 'Coach Shayan', time: 'Thursday 06:00 PM', enrolled: false, spots: '1 spot left' },
  { id: '3', title: 'Yoga Masterclass: Breathwork', trainer: 'Acharya Dev', time: 'Friday 07:00 AM', enrolled: false, spots: '8 spots left' }
];

const AVAILABLE_SLOTS = [
  { id: '1', range: '06:00 AM - 08:00 AM', status: 'Optimal', fill: 0.25, color: '#38ef7d' },
  { id: '2', range: '08:00 AM - 10:00 AM', status: 'Moderate', fill: 0.55, color: '#f6d365' },
  { id: '3', range: '10:00 AM - 12:00 PM', status: 'Less Crowd', fill: 0.15, color: '#38ef7d' },
  { id: '4', range: '04:00 PM - 06:00 PM', status: 'Peak Crowd', fill: 0.88, color: '#ff0844' },
  { id: '5', range: '06:00 PM - 08:00 PM', status: 'Peak Crowd', fill: 0.95, color: '#ff0844' },
  { id: '6', range: '08:00 PM - 10:00 PM', status: 'Moderate', fill: 0.48, color: '#f6d365' }
];

const MOCK_FORUM_POSTS = [
  {
    id: 'post-1',
    customerName: 'Rahul Sharma',
    title: '🏋️ Who is up for a 6:30 AM strength session tomorrow?',
    content: 'Planning to hit heavy HRX Strength & Conditioning tomorrow morning in Koramangala. Looking for a workout partner to spot each other on bench press and squats!',
    likesCount: 3,
    isLiked: false,
    comments: [
      { id: 'c1', customerName: 'Marcus Dutt', content: 'Count me in Rahul! Let’s crush some heavy squats.', time: '2 hours ago' },
      { id: 'c2', customerName: 'Priya Patel', content: 'Wish I could make it but I have Yoga at 8 AM. Spot me next time!', time: '1 hour ago' }
    ]
  },
  {
    id: 'post-2',
    customerName: 'Marcus Dutt',
    title: '🥗 Carpool coordination for Zumba Masterclass',
    content: 'I have 3 empty seats in my car for the upcoming Zumba Special Masterclass this Wednesday. Let me know if anyone from HSR Layout wants a ride!',
    likesCount: 8,
    isLiked: true,
    comments: []
  }
];

export default function App() {
  // Theme State
  const [theme, setTheme] = useState('dark');
  const isLight = theme === 'light';

  const textColor = isLight ? '#0f172a' : '#ffffff';
  const mutedColor = isLight ? '#64748b' : '#9ca3af';
  const panelBg = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(18, 26, 44, 0.7)';
  const borderLight = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';
  const viewBg = isLight ? '#f8fafc' : '#0a0e17';

  const t = {
    bg: viewBg,
    card: panelBg,
    border: borderLight,
    textMain: textColor,
    textMuted: mutedColor,
    textBright: textColor,
    inputBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 14, 23, 0.6)',
  };

  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [challenges, setChallenges] = useState(MOCK_CHALLENGES);
  const [isAttemptModalVisible, setIsAttemptModalVisible] = useState(false);
  const [selectedChallengeForAttempt, setSelectedChallengeForAttempt] = useState(null);
  const [attemptMinutes, setAttemptMinutes] = useState('');
  const [attemptSeconds, setAttemptSeconds] = useState('');
  const [attemptLoading, setAttemptLoading] = useState(false);
  
  // Navigation & Sub-states
  const [activeAppTab, setActiveAppTab] = useState('workout'); // 'workout' | 'community'
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [isNewPostModalVisible, setIsNewPostModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('08:00 AM - 10:00 AM');
  
  // Feed States
  const [specialClasses, setSpecialClasses] = useState(MOCK_SPECIAL_CLASSES);
  const [forumPosts, setForumPosts] = useState(MOCK_FORUM_POSTS);
  const [scanType, setScanType] = useState('Check-In'); // Check-In / Check-Out
  const [workoutStreak, setWorkoutStreak] = useState(4);
  const [isUpiModalVisible, setIsUpiModalVisible] = useState(false);
  const [upiAmount, setUpiAmount] = useState(12999);
  const [isMilestonesModalVisible, setIsMilestonesModalVisible] = useState(false);
  
  // Forum Forms
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [commentInputs, setCommentInputs] = useState({});

  // Dynamic QR & Live Chat states
  const [forumSubTab, setForumSubTab] = useState('bulletin');
  const [qrTimeLeft, setQrTimeLeft] = useState(30);
  const [qrSuffix, setQrSuffix] = useState(58291);
  const [chatInputText, setChatInputText] = useState('');
  const [liveChatMessages, setLiveChatMessages] = useState([
    { id: 'm1', name: 'Priya Patel', text: 'Hey guys, who is hitting the gym at 6 PM today?', time: '07:08 AM' },
    { id: 'm2', name: 'Marcus Dutt', text: 'I am planning to hit it at 6 PM! Zumba class afterwards?', time: '07:09 AM' },
    { id: 'm3', name: 'Rahul Sharma', text: 'Zumba with Coach Sarah is always a blast. Count me in!', time: '07:11 AM' }
  ]);

  useEffect(() => {
    let timer;
    if (isScanModalVisible) {
      timer = setInterval(() => {
        setQrTimeLeft(prev => {
          if (prev <= 1) {
            setQrSuffix(Math.floor(10000 + Math.random() * 90000));
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setQrTimeLeft(30);
    }
    return () => clearInterval(timer);
  }, [isScanModalVisible]);

  useEffect(() => {
    if (currentUser) {
      const gymIdVal = currentUser.gymId?._id || currentUser.gymId || '777'; // Fallback
      const actualGymId = (gymIdVal === 'Fitmaniac Center Koramangala' || gymIdVal === 'Cult Center Koramangala') ? '777' : gymIdVal;
      fetchChallenges(actualGymId);
    }
  }, [currentUser]);

  const fetchChallenges = async (gymIdVal) => {
    try {
      const res = await fetch(`${BACKEND_BASE}/challenges?gymId=${gymIdVal}`);
      const data = await res.json();
      if (data.success) {
        setChallenges(data.challenges);
      }
    } catch (e) {
      console.log('Using offline mock challenges.');
    }
  };

  const handleLogAttempt = async () => {
    if (!attemptMinutes || !attemptSeconds) {
      Alert.alert('Missing Fields ⚠️', 'Please input both minutes and seconds completed.');
      return;
    }

    const minVal = parseInt(attemptMinutes) || 0;
    const secVal = parseInt(attemptSeconds) || 0;

    if (minVal < 0 || secVal < 0 || secVal >= 60) {
      Alert.alert('Invalid Time ⚠️', 'Please enter valid minutes and seconds (0-59).');
      return;
    }

    setAttemptLoading(true);
    const gymIdVal = currentUser.gymId?._id || '777';
    const actualGymId = (gymIdVal === 'Fitmaniac Center Koramangala' || gymIdVal === 'Cult Center Koramangala') ? '777' : gymIdVal;

    const payload = {
      customerId: currentUser.id || currentUser._id,
      minutes: minVal,
      seconds: secVal
    };

    try {
      const res = await fetch(`${BACKEND_BASE}/challenges/${selectedChallengeForAttempt._id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Attempt Logged! ⏱️', `Your completed time of ${minVal}:${secVal.toString().padStart(2, '0')} has been recorded.`);
        fetchChallenges(actualGymId);
        setIsAttemptModalVisible(false);
        setAttemptMinutes('');
        setAttemptSeconds('');
      } else {
        mockLogAttemptLocal(minVal, secVal);
      }
    } catch (e) {
      mockLogAttemptLocal(minVal, secVal);
    } finally {
      setAttemptLoading(false);
    }
  };

  const mockLogAttemptLocal = (minVal, secVal) => {
    const totalSeconds = minVal * 60 + secVal;
    const timeStr = `${minVal}:${secVal.toString().padStart(2, '0')}`;
    const custId = currentUser.id || currentUser._id;
    
    setChallenges(prev => prev.map(chal => {
      if (chal._id === selectedChallengeForAttempt._id) {
        const existingIndex = chal.leaderboard.findIndex(e => e.customerId === custId);
        let nextLeaderboard = [...chal.leaderboard];

        if (existingIndex > -1) {
          if (totalSeconds < nextLeaderboard[existingIndex].seconds) {
            nextLeaderboard[existingIndex] = {
              ...nextLeaderboard[existingIndex],
              timeString: timeStr,
              seconds: totalSeconds
            };
          }
        } else {
          nextLeaderboard.push({
            customerId: custId,
            customerName: currentUser.name || 'Rahul Sharma (You)',
            timeString: timeStr,
            seconds: totalSeconds
          });
        }

        // Sort ascending by seconds
        nextLeaderboard.sort((a, b) => a.seconds - b.seconds);

        return {
          ...chal,
          leaderboard: nextLeaderboard
        };
      }
      return chal;
    }));

    Alert.alert('Attempt Logged (Local)! ⏱️', `Offline Mode: Recorded time ${timeStr} inside local segment.`);
    setIsAttemptModalVisible(false);
    setAttemptMinutes('');
    setAttemptSeconds('');
  };

  const handleVerifyUpiPayment = () => {
    setIsUpiModalVisible(false);
    const nextEndDate = new Date();
    nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
    setCurrentUser({
      ...currentUser,
      subscription: {
        ...currentUser.subscription,
        status: 'Active',
        pricePaid: upiAmount,
        endDate: nextEndDate.toISOString()
      }
    });
    Alert.alert(
      'UPI Payment Verified! 🟢',
      `Fitmaniac has successfully received your payment of ₹${upiAmount.toLocaleString('en-IN')}.\n\nYour pass is instantly active for another billing cycle!`
    );
  };

  // One-Click Bypass for Seamless Local Demonstration (No DB required!)
  const handleQuickDemoBypass = () => {
    setAuthLoading(true);
    setAuthError('');
    setTimeout(() => {
      setCurrentUser(FALLBACK_USER);
      setIsLoggedIn(true);
      setAuthLoading(false);
      Alert.alert('Logged In (Demo mode) 💡', 'Success! Preview mode enabled with sample metrics.');
    }, 400);
  };

  // 1. Trigger OTP Magic Link Request
  const handleRequestOtp = async () => {
    setAuthError('');
    const emailVal = emailInput.trim().toLowerCase();
    
    if (!emailVal) {
      setAuthError('Please enter your registered email address.');
      return;
    }

    // Direct client bypass if offline fallback email is used
    if (emailVal === 'rahul@gmail.com') {
      setIsOtpSent(true);
      Alert.alert(
        'Magic OTP Sent! 📨', 
        `Pre-configured Indian member detected.\n\n[Dev Preview] Enter OTP: 1234`
      );
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${BACKEND_BASE}/login-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal })
      });
      const data = await res.json();

      if (data.success) {
        setIsOtpSent(true);
        Alert.alert(
          'Magic OTP Sent! 📨', 
          `A secure verification code has been dispatched. \n\n[Dev Preview] Your OTP is: ${data.otp}`
        );
      } else {
        setAuthError(data.message || 'Verification request failed.');
      }
    } catch (e) {
      // Local fallback in case server throws connection errors
      setIsOtpSent(true);
      Alert.alert(
        'Magic OTP Sent (Local Mode)! 📨', 
        `Offline connection mode activated.\n\n[Dev Preview] Enter OTP: 1234`
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Verify OTP and Sign-in
  const handleVerifyOtp = async () => {
    setAuthError('');
    const otpVal = otpInput.trim();
    
    if (!otpVal || otpVal.length !== 4) {
      setAuthError('Please enter the 4-digit verification code.');
      return;
    }

    // Direct client bypass verification
    if (emailInput.trim().toLowerCase() === 'rahul@gmail.com' && otpVal === '1234') {
      setCurrentUser(FALLBACK_USER);
      setIsLoggedIn(true);
      setOtpInput('');
      setIsOtpSent(false);
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${BACKEND_BASE}/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailInput.trim().toLowerCase(), 
          otp: otpVal
        })
      });
      const data = await res.json();

      if (data.success) {
        setCurrentUser(data.customer);
        setIsLoggedIn(true);
        setOtpInput('');
        setIsOtpSent(false);
      } else {
        setAuthError(data.message || 'OTP verification failed.');
      }
    } catch (e) {
      // Offline fallback verification logic
      if (otpVal === '1234') {
        setCurrentUser(FALLBACK_USER);
        setIsLoggedIn(true);
        setOtpInput('');
        setIsOtpSent(false);
      } else {
        setAuthError('Invalid OTP code. Enter "1234" to test offline.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setEmailInput('');
    setOtpInput('');
    setIsOtpSent(false);
  };

  // Scan mockup action
  const triggerScanResult = () => {
    setIsScanModalVisible(false);
    if (scanType === 'Check-In') {
      Alert.alert(
        'Check-In Successful! 🟢',
        `Welcome to ${currentUser?.gymId?.name || 'Fitmaniac Center Koramangala'}. Remember to scan again when checking out to compute your duration.`,
        [{ text: 'Start Workout', onPress: () => setScanType('Check-Out') }]
      );
    } else {
      Alert.alert(
        'Check-Out Complete! 🔴',
        'Workout recorded: 92 minutes. Great job today!',
        [{ text: 'View Analytics', onPress: () => setScanType('Check-In') }]
      );
    }
  };

  const handleEnrollClass = (id, title) => {
    setSpecialClasses(prev => prev.map(c => {
      if (c.id === id) {
        if (c.enrolled) return c;
        Alert.alert('Enrolled Successfully! 🎉', `You have registered for the ${title}.`);
        return { ...c, enrolled: true };
      }
      return c;
    }));
  };

  const handleLikePost = (postId) => {
    setForumPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = !post.isLiked;
        return {
          ...post,
          isLiked,
          likesCount: isLiked ? post.likesCount + 1 : post.likesCount - 1
        };
      }
      return post;
    }));
  };

  const handlePostComment = (postId) => {
    const txt = commentInputs[postId];
    if (!txt || !txt.trim()) return;

    setForumPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [
            ...post.comments,
            { id: Date.now().toString(), customerName: currentUser?.name || 'Athlete', content: txt, time: 'Just now' }
          ]
        };
      }
      return post;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleCreatePost = () => {
    if (!newPostTitle || !newPostContent) {
      Alert.alert('Missing Fields ⚠️', 'Please write a post title and content description.');
      return;
    }

    const newPostObj = {
      id: Date.now().toString(),
      customerName: currentUser?.name || 'Athlete',
      title: newPostTitle,
      content: newPostContent,
      likesCount: 0,
      isLiked: false,
      comments: []
    };

    setForumPosts([newPostObj, ...forumPosts]);
    setIsNewPostModalVisible(false);
    setNewPostTitle('');
    setNewPostContent('');
    Alert.alert('Published! 📢', 'Your thread has been posted on the gym community board.');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: viewBg }]}>
      <StatusBar style={isLight ? "dark" : "light"} />

      {!isLoggedIn ? (
        /* ========================================================
           🔑 PASSWORDLESS MAGIC OTP LOGIN SCREEN
           ======================================================== */
        <ScrollView contentContainerStyle={[styles.loginContainer, { backgroundColor: viewBg }]}>
          <View style={[styles.loginCard, { backgroundColor: panelBg, borderColor: borderLight }]}>
            
            {/* Theme Toggle Button */}
            <TouchableOpacity 
              onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ position: 'absolute', top: 15, right: 15, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)', zIndex: 10 }}
            >
              <Text style={{ fontSize: 14 }}>{isLight ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>

            {/* Glowing Brand Header */}
            <View style={{ alignItems: 'center', marginBottom: 35 }}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>🏋️</Text>
              </View>
              <Text style={[styles.loginBrand, { color: textColor }]}>FITMANIAC</Text>
              <Text style={[styles.loginBrandMuted, { color: mutedColor }]}>Connected Fitness Ecosystem</Text>
            </View>

            <Text style={[styles.loginTitle, { color: textColor }]}>
              {isOtpSent ? 'Verify Code' : 'Sign In'}
            </Text>
            <Text style={[styles.loginDesc, { color: mutedColor }]}>
              {isOtpSent 
                ? `Enter the 4-digit code sent to ${emailInput}` 
                : 'Enter your registered email address below to receive your magic access code.'
              }
            </Text>

            {authError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {authError}</Text>
              </View>
            ) : null}

            {!isOtpSent ? (
              /* Email Input State */
              <View style={{ gap: 18 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: mutedColor }]}>EMAIL ADDRESS</Text>
                  <TextInput
                    placeholder="e.g. rahul@gmail.com"
                    placeholderTextColor="#6b7280"
                    style={[styles.formInput, { backgroundColor: t.inputBg, color: textColor }]}
                    value={emailInput}
                    onChangeText={(txt) => { setEmailInput(txt); setAuthError(''); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Text style={styles.inputTip}>Type "rahul@gmail.com" to skip API calls.</Text>
                </View>

                <TouchableOpacity 
                  style={styles.btnPrimary} 
                  onPress={handleRequestOtp}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.btnPriText}>🚀 SEND MAGIC OTP</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Instant Bypass One-Click Button */}
                <TouchableOpacity 
                  style={styles.btnBypass} 
                  onPress={handleQuickDemoBypass}
                >
                  <Text style={styles.btnBypassText}>💡 ONE-CLICK DEMO LOGIN</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* OTP Verification State */
              <View style={{ gap: 18 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: mutedColor }]}>4-DIGIT VERIFICATION CODE</Text>
                  <TextInput
                    placeholder="e.g. 1234"
                    placeholderTextColor="#6b7280"
                    style={[styles.formInput, styles.otpInputText, { backgroundColor: t.inputBg, color: textColor }]}
                    value={otpInput}
                    onChangeText={(txt) => { setOtpInput(txt.replace(/[^0-9]/g, '')); setAuthError(''); }}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Text style={styles.inputTip}>Enter "1234" for instant verification.</Text>
                </View>

                <TouchableOpacity 
                  style={styles.btnPrimary} 
                  onPress={handleVerifyOtp}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.btnPriText}>🔑 VERIFY & SIGN IN</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ alignSelf: 'center', marginTop: 10 }}
                  onPress={() => { setIsOtpSent(false); setOtpInput(''); setAuthError(''); }}
                >
                  <Text style={{ color: '#00f2fe', fontSize: 13, fontWeight: 'bold' }}>← Back to Email</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </ScrollView>
      ) : (
        /* ========================================================
           🏁 MAIN DASHBOARD & TABS VIEW (LOGGED IN)
           ======================================================== */
        <View style={{ flex: 1, backgroundColor: viewBg }}>
          {/* Top Header Navigation Tabs */}
          <View style={[styles.tabNav, { backgroundColor: isLight ? '#f1f5f9' : '#111827', borderBottomWidth: 1, borderBottomColor: borderLight }]}>
            <TouchableOpacity 
              style={[styles.navTabBtn, activeAppTab === 'workout' ? styles.activeNavTab : {}, { borderBottomColor: activeAppTab === 'workout' ? '#00f2fe' : 'transparent' }]}
              onPress={() => setActiveAppTab('workout')}
            >
              <Text style={[styles.navTabLabel, activeAppTab === 'workout' ? styles.activeNavLabel : {}, { color: activeAppTab === 'workout' ? '#00f2fe' : mutedColor }]}>🏋️ WORKOUTS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.navTabBtn, activeAppTab === 'community' ? styles.activeNavTab : {}, { borderBottomColor: activeAppTab === 'community' ? '#00f2fe' : 'transparent' }]}
              onPress={() => setActiveAppTab('community')}
            >
              <Text style={[styles.navTabLabel, activeAppTab === 'community' ? styles.activeNavLabel : {}, { color: activeAppTab === 'community' ? '#00f2fe' : mutedColor }]}>💬 COMMUNITY</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[styles.container, { backgroundColor: viewBg }]}>
            
            {/* User details header with Sign Out and Theme Toggle */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.headerSubtitle, { color: mutedColor }]}>{currentUser?.gymId?.name ? currentUser.gymId.name.toUpperCase() : 'PARTNER GYM'}</Text>
                <Text style={[styles.headerTitle, { color: textColor }]}>{currentUser?.name || 'Athlete'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ fontSize: 12 }}>{isLight ? '☀️' : '🌙'}</Text>
                  </TouchableOpacity>
                  <View style={styles.membershipBadge}>
                    <Text style={styles.membershipText}>{currentUser?.subscription?.planType ? `${currentUser.subscription.planType.toUpperCase()} PASS` : 'ELITE PASS'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleSignOut}>
                  <Text style={{ color: '#ff0844', fontSize: 12, fontWeight: 'bold' }}>Sign Out ⎋</Text>
                </TouchableOpacity>
              </View>
            </View>

            {activeAppTab === 'workout' ? (
              /* Workouts Panel View */
              <View>
                {/* Expiry Warning Notification Banner */}
                {currentUser?.subscription?.endDate && (new Date(currentUser.subscription.endDate) - new Date() < 5 * 24 * 60 * 60 * 1000) && (
                  <View style={[styles.glassPanel, { borderColor: '#f6d365', backgroundColor: 'rgba(246, 211, 101, 0.08)', padding: 15, marginBottom: 15 }]}>
                    <Text style={{ color: '#f6d365', fontWeight: 'bold', fontSize: 13, fontFamily: 'Outfit' }}>⚠️ FITMANIAC PASS EXPIRING SOON!</Text>
                    <Text style={{ color: mutedColor, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                      Your {currentUser.subscription.planType} Pass is expiring on {new Date(currentUser.subscription.endDate).toLocaleDateString()}. Renew now to carry forward your unused {currentUser.carryForwardDays} absent days!
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <TouchableOpacity 
                        style={{ backgroundColor: '#38ef7d', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 }}
                        onPress={() => { setUpiAmount(currentUser?.subscription?.pricePaid || 12999); setIsUpiModalVisible(true); }}
                      >
                        <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 10 }}>⚡ PAY INSTANT UPI</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 }}
                        onPress={() => Alert.alert('Desk Cash Payment 💵', 'Please pay UPI or Cash directly to the receptionist at Fitmaniac Center Koramangala.')}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 10 }}>DESK CASH</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Stats Panel */}
                <View style={[styles.glassPanel, { backgroundColor: panelBg, borderColor: borderLight }]}>
                  <Text style={[styles.panelTitle, { color: textColor }]}>Your Weekly Progress</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={[styles.statVal, { color: textColor }]}>{workoutStreak} Days</Text>
                      <Text style={[styles.statLabel, { color: mutedColor }]}>Streak</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: borderLight }]} />
                    <View style={styles.statBox}>
                      <Text style={[styles.statVal, { color: '#00f2fe' }]}>{currentUser?.carryForwardDays || 0}</Text>
                      <Text style={[styles.statLabel, { color: mutedColor }]}>Carried Days</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: borderLight }]} />
                    <View style={styles.statBox}>
                      <Text style={[styles.statVal, { color: '#38ef7d' }]}>92 min</Text>
                      <Text style={[styles.statLabel, { color: mutedColor }]}>Avg Workout</Text>
                    </View>
                  </View>

                  {/* Dynamic Streak Achievements Badge Shelf */}
                  <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: borderLight, paddingTop: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: textColor, marginBottom: 8 }}>🏆 Earned Streak Badges</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ alignItems: 'center', opacity: workoutStreak >= 5 ? 1 : 0.25 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(246, 211, 101, 0.15)', borderWidth: 1, borderColor: '#f6d365', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16 }}>🥉</Text>
                        </View>
                        <Text style={{ fontSize: 8, color: mutedColor, marginTop: 4, fontWeight: '600' }}>Bronze</Text>
                      </View>
                      <View style={{ alignItems: 'center', opacity: workoutStreak >= 10 ? 1 : 0.25 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(229, 231, 235, 0.15)', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16 }}>🥈</Text>
                        </View>
                        <Text style={{ fontSize: 8, color: mutedColor, marginTop: 4, fontWeight: '600' }}>Silver</Text>
                      </View>
                      <View style={{ alignItems: 'center', opacity: workoutStreak >= 30 ? 1 : 0.25 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 242, 254, 0.15)', borderWidth: 1, borderColor: '#00f2fe', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16 }}>🥇</Text>
                        </View>
                        <Text style={{ fontSize: 8, color: mutedColor, marginTop: 4, fontWeight: '600' }}>Gold</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: borderLight, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => setIsMilestonesModalVisible(true)}
                  >
                    <Text style={{ fontSize: 11, color: mutedColor }}>🏆 Streak Milestone: <Text style={{ color: '#38ef7d', fontWeight: 'bold' }}>Bronze Level (4/5 days)</Text></Text>
                    <Text style={{ fontSize: 11, color: '#00f2fe', fontWeight: 'bold' }}>View Badges ➔</Text>
                  </TouchableOpacity>
                </View>

                {/* Scan check-in gate card */}
                <View style={styles.glassPanel}>
                  <Text style={styles.panelTitle}>Daily Attendance Scanner</Text>
                  <Text style={styles.description}>
                    Scan the barcode at the gym entrance to Check-In, and scan it again at the exit to compute your session duration.
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.scanButton, scanType === 'Check-Out' ? styles.checkoutBg : {}]} 
                    onPress={() => setIsScanModalVisible(true)}
                  >
                    <Text style={styles.scanButtonText}>
                      {scanType === 'Check-In' ? '📷 SCAN ENTRY CODE' : '📷 SCAN EXIT CODE'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Flexible workout slot */}
                <View style={styles.glassPanel}>
                  <Text style={styles.panelTitle}>Flexible Workout Slot</Text>
                  <Text style={styles.description}>
                    Choose any 2-hour workout window for today. Selected: <Text style={{ color: '#f6d365', fontWeight: 'bold' }}>{selectedSlot}</Text>
                  </Text>

                  <View style={styles.slotGrid}>
                    {AVAILABLE_SLOTS.map(slot => {
                      const isSelected = slot.range === selectedSlot;
                      return (
                        <TouchableOpacity 
                          key={slot.id} 
                          style={[styles.slotCard, isSelected ? styles.selectedSlotCard : {}]}
                          onPress={() => setSelectedSlot(slot.range)}
                        >
                          <Text style={[styles.slotText, isSelected ? styles.selectedSlotText : {}]}>{slot.range}</Text>
                          <Text style={styles.slotStatus}>{slot.status}</Text>
                          {/* Live Occupancy Neon Bar */}
                          <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                            <View style={{ width: `${slot.fill * 100}%`, height: '100%', backgroundColor: slot.color }} />
                          </View>
                          <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 4 }}>👥 {Math.round(slot.fill * 100)}% Full</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Daily Live Occupancy Heatmap Visual */}
                  <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(10, 14, 23, 0.4)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 }}>📊 Peak Occupancy Heatmap (Daily Trend)</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 40, paddingTop: 10, paddingBottom: 5 }}>
                      <View style={{ width: '12%', height: 32, backgroundColor: '#38ef7d', borderRadius: 2 }} />
                      <View style={{ width: '12%', height: 40, backgroundColor: '#ff0844', borderRadius: 2 }} />
                      <View style={{ width: '12%', height: 12, backgroundColor: '#38ef7d', borderRadius: 2 }} />
                      <View style={{ width: '12%', height: 20, backgroundColor: '#38ef7d', borderRadius: 2 }} />
                      <View style={{ width: '12%', height: 35, backgroundColor: '#f6d365', borderRadius: 2 }} />
                      <View style={{ width: '12%', height: 40, backgroundColor: '#ff0844', borderRadius: 2 }} />
                      <View style={{ width: '12%', height: 25, backgroundColor: '#f6d365', borderRadius: 2 }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={{ fontSize: 6, color: '#9ca3af' }}>06 AM</Text>
                      <Text style={{ fontSize: 6, color: '#9ca3af' }}>08 AM</Text>
                      <Text style={{ fontSize: 6, color: '#9ca3af' }}>10 AM</Text>
                      <Text style={{ fontSize: 6, color: '#9ca3af' }}>12 PM</Text>
                      <Text style={{ fontSize: 6, color: '#9ca3af' }}>04 PM</Text>
                      <Text style={{ fontSize: 6, color: '#9ca3af' }}>06 PM</Text>
                      <Text style={{ fontSize: 6, color: '#9ca3af' }}>08 PM</Text>
                    </View>
                  </View>
                </View>

                {/* Studio special classes */}
                <View style={styles.glassPanel}>
                  <Text style={styles.panelTitle}>Special Studio Sessions</Text>
                  <Text style={styles.description}>
                    Register for trainer-led special group workshops. Access included in your Fitmaniac Pass.
                  </Text>

                  {specialClasses.map(item => (
                    <View key={item.id} style={styles.classCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.classTitle}>{item.title}</Text>
                        <Text style={styles.classMeta}>Trainer: {item.trainer} | {item.spots}</Text>
                        <Text style={styles.classTime}>🕒 {item.time}</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.classBookBtn, item.enrolled ? styles.enrolledBtn : {}]}
                        onPress={() => handleEnrollClass(item.id, item.title)}
                        disabled={item.enrolled}
                      >
                        <Text style={styles.classBookBtnText}>{item.enrolled ? 'Enrolled' : 'Join'}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>



                {/* Strava-Style Gym Segment Challenges */}
                <View style={styles.glassPanel}>
                  <Text style={styles.panelTitle}>🏃 Strava-Style Gym Segment Challenges</Text>
                  <Text style={styles.description}>Compete on local physical circuits inside {currentUser?.gymId?.name || 'Fitmaniac Center Koramangala'}.</Text>
                  
                  {challenges && challenges.map(chal => (
                    <View key={chal._id} style={{ marginTop: 15, backgroundColor: 'rgba(10,14,23,0.2)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ff0844' }}>{chal.title}</Text>
                          <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{chal.description}</Text>
                        </View>
                        <TouchableOpacity 
                          style={{ backgroundColor: '#00f2fe', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 }}
                          onPress={() => { setSelectedChallengeForAttempt(chal); setIsAttemptModalVisible(true); }}
                        >
                          <Text style={{ color: '#000000', fontSize: 10, fontWeight: 'bold' }}>⏱️ LOG TIME</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={{ padding: 8 }}>
                        {chal.leaderboard && chal.leaderboard.length > 0 ? (
                          chal.leaderboard.map((entry, idx) => {
                            const isMe = entry.customerId === (currentUser.id || currentUser._id || 'rahul-fallback-id');
                            return (
                              <View key={entry.customerId || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: idx < chal.leaderboard.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.02)' }}>
                                <Text style={{ fontSize: 11, color: idx === 0 ? '#f6d365' : isMe ? '#ffffff' : '#9ca3af', fontWeight: isMe ? 'bold' : 'normal' }}>
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏃'} {idx + 1}. {entry.customerName} {isMe ? '(You)' : ''}
                                </Text>
                                <Text style={{ fontSize: 11, color: idx === 0 ? '#f6d365' : isMe ? '#ffffff' : '#e5e7eb', fontWeight: 'bold' }}>
                                  {entry.timeString}
                                </Text>
                              </View>
                            );
                          })
                        ) : (
                          <Text style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
                            No times logged yet. Be the first to try!
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              /* Community Hub View */
              <View style={{ flex: 1 }}>
                {/* Community Sub Tabs */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, paddingHorizontal: 15, paddingTop: 5 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: forumSubTab === 'bulletin' ? '#00f2fe' : borderLight, backgroundColor: forumSubTab === 'bulletin' ? 'rgba(0, 242, 254, 0.05)' : panelBg, alignItems: 'center' }}
                    onPress={() => setForumSubTab('bulletin')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: forumSubTab === 'bulletin' ? '#00f2fe' : textColor }}>📌 Bulletin Board</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: forumSubTab === 'chat' ? '#00f2fe' : borderLight, backgroundColor: forumSubTab === 'chat' ? 'rgba(0, 242, 254, 0.05)' : panelBg, alignItems: 'center' }}
                    onPress={() => setForumSubTab('chat')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: forumSubTab === 'chat' ? '#00f2fe' : textColor }}>💬 Lobby Live Chat</Text>
                  </TouchableOpacity>
                </View>

                {forumSubTab === 'bulletin' ? (
                  /* ========================================================
                     📌 BULLETIN BOARD SUBTAB VIEW
                     ======================================================== */
                  <View style={{ paddingHorizontal: 15 }}>
                    <View style={[styles.glassPanel, { backgroundColor: panelBg, borderColor: borderLight, marginBottom: 15 }]}>
                      <TouchableOpacity 
                        style={styles.postTriggerBtn} 
                        onPress={() => setIsNewPostModalVisible(true)}
                      >
                        <Text style={[styles.postTriggerBtnText, { color: mutedColor }]}>✍️ Start a Discussion Thread...</Text>
                      </TouchableOpacity>
                    </View>

                    {forumPosts.map(post => (
                      <View key={post.id} style={[styles.glassPanel, { backgroundColor: panelBg, borderColor: borderLight }]}>
                        <View style={styles.forumHeader}>
                          <View style={[styles.avatarMock, { backgroundColor: isLight ? '#00f2fe' : 'rgba(0, 242, 254, 0.15)' }]}><Text style={[styles.avatarChar, { color: isLight ? '#000000' : '#00f2fe' }]}>{post.customerName[0]}</Text></View>
                          <View>
                            <Text style={[styles.forumPoster, { color: textColor }]}>{post.customerName}</Text>
                            <Text style={[styles.forumMeta, { color: mutedColor }]}>Gym Co-Member</Text>
                          </View>
                        </View>

                        <Text style={[styles.forumTitle, { color: textColor }]}>{post.title}</Text>
                        <Text style={[styles.forumContent, { color: mutedColor }]}>{post.content}</Text>

                        <View style={styles.forumActionsRow}>
                          <TouchableOpacity 
                            style={[styles.actionBtn, post.isLiked ? styles.likedAction : {}]} 
                            onPress={() => handleLikePost(post.id)}
                          >
                            <Text style={[styles.actionBtnText, post.isLiked ? styles.likedText : {}, { color: post.isLiked ? '#ff0844' : textColor }]}>
                              ❤️ {post.likesCount} {post.isLiked ? 'Liked' : 'Like'}
                            </Text>
                          </TouchableOpacity>
                          <Text style={[styles.commentCountText, { color: mutedColor }]}>💬 {post.comments.length} comments</Text>
                        </View>

                        {post.comments.length > 0 && (
                          <View style={[styles.commentSection, { borderTopColor: borderLight }]}>
                            {post.comments.map(c => (
                              <View key={c.id} style={styles.commentCard}>
                                <Text style={[styles.commentAuthor, { color: textColor }]}>{c.customerName} <Text style={{ fontSize: 9, color: mutedColor }}>• {c.time}</Text></Text>
                                <Text style={[styles.commentContent, { color: mutedColor }]}>{c.content}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={[styles.commentInputRow, { borderTopColor: borderLight }]}>
                          <TextInput 
                            placeholder="Write a comment..." 
                            placeholderTextColor="#9ca3af"
                            style={[styles.commentInput, { backgroundColor: t.inputBg, color: textColor }]} 
                            value={commentInputs[post.id] || ''}
                            onChangeText={(txt) => setCommentInputs(prev => ({ ...prev, [post.id]: txt }))}
                          />
                          <TouchableOpacity style={styles.sendCommentBtn} onPress={() => handlePostComment(post.id)}>
                            <Text style={styles.sendCommentBtnText}>Send</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  /* ========================================================
                     💬 LOBBY LIVE CHAT SUBTAB VIEW
                     ======================================================== */
                  <View style={{ paddingHorizontal: 15 }}>
                    <View style={[styles.glassPanel, { backgroundColor: panelBg, borderColor: borderLight, height: 350, justifyContent: 'space-between' }]}>
                      
                      <ScrollView 
                        style={{ flex: 1, marginBottom: 10 }}
                        contentContainerStyle={{ gap: 10 }}
                        ref={ref => { this.chatScrollView = ref; }}
                        onContentSizeChange={() => this.chatScrollView?.scrollToEnd({ animated: true })}
                      >
                        {liveChatMessages.map(msg => {
                          const isMe = msg.name === (currentUser?.name || 'Rahul Sharma');
                          return (
                            <View 
                              key={msg.id} 
                              style={{ 
                                alignSelf: isMe ? 'flex-end' : 'flex-start', 
                                maxWidth: '80%', 
                                backgroundColor: isMe ? 'rgba(0, 242, 254, 0.12)' : isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.03)', 
                                borderWidth: 1, 
                                borderColor: isMe ? '#00f2fe' : borderLight, 
                                borderRadius: 8, 
                                paddingHorizontal: 12, 
                                paddingVertical: 6 
                              }}
                            >
                              <Text style={{ fontSize: 8, fontWeight: 'bold', color: isMe ? '#00f2fe' : '#f6d365', marginBottom: 2 }}>{msg.name}</Text>
                              <Text style={{ fontSize: 12, color: textColor, lineHeight: 16 }}>{msg.text}</Text>
                              <Text style={{ fontSize: 6, color: mutedColor, textAlign: 'right', marginTop: 3 }}>{msg.time}</Text>
                            </View>
                          );
                        })}
                      </ScrollView>

                      <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: borderLight, paddingTop: 10 }}>
                        <TextInput 
                          placeholder="Send message to center..." 
                          placeholderTextColor="#9ca3af"
                          style={[styles.formInput, { flex: 1, height: 38, paddingVertical: 0, backgroundColor: t.inputBg, color: textColor }]} 
                          value={chatInputText}
                          onChangeText={setChatInputText}
                        />
                        <TouchableOpacity 
                          style={{ backgroundColor: '#00f2fe', borderRadius: 8, paddingHorizontal: 15, justifyContent: 'center', height: 38 }} 
                          onPress={() => {
                            if (!chatInputText.trim()) return;
                            const now = new Date();
                            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            setLiveChatMessages([
                              ...liveChatMessages,
                              { id: Date.now().toString(), name: currentUser?.name || 'Rahul Sharma', text: chatInputText.trim(), time: timeStr }
                            ]);
                            setChatInputText('');
                          }}
                        >
                          <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 12 }}>Send</Text>
                        </TouchableOpacity>
                      </View>

                    </View>
                  </View>
                )}
              </View>
            )}

          </ScrollView>
        </View>
      )}

      {/* Dynamic Security QR Pass Modal */}
      <Modal visible={isScanModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalWindow}>
            <Text style={styles.modalTitle}>🛡️ Dynamic Entrance Pass</Text>
            <Text style={styles.modalDesc}>Hold this secure QR pass up to the entrance gate scanner terminal reader.</Text>
            
            <View style={{ width: 140, height: 140, padding: 10, backgroundColor: '#000000', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#00f2fe' }}>
              <Text style={{ fontSize: 32 }}>🌀</Text>
              <Text style={{ fontSize: 9, color: '#00f2fe', fontWeight: 'bold', marginTop: 10, fontFamily: 'monospace' }}>
                {(currentUser?.gymId?.barcodeToken || 'FITFREAK_001').toUpperCase()}_{qrSuffix}
              </Text>
            </View>

            <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 20 }}>
              Regenerating secure code in <Text style={{ color: '#ff0844', fontWeight: 'bold' }}>{qrTimeLeft}</Text>s
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsScanModalVisible(false)}>
                <Text style={styles.btnSecText}>Close Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={triggerScanResult}>
                <Text style={styles.btnPriText}>Simulate Gate Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create New Forum Post Modal */}
      <Modal visible={isNewPostModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalWindow}>
            <Text style={styles.modalTitle}>✍️ Start Community Thread</Text>
            <Text style={styles.modalDesc}>Post coordinates or ask fitness questions to co-members at your Gym.</Text>
            
            <View style={{ width: '100%', gap: 14, marginBottom: 24 }}>
              <TextInput 
                placeholder="Topic / Title (e.g. Squad workout at 7 PM)" 
                placeholderTextColor="#9ca3af"
                style={styles.formInput} 
                value={newPostTitle}
                onChangeText={setNewPostTitle}
              />
              <TextInput 
                placeholder="What is on your mind? Share gym plans, coordinate routes..." 
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                style={[styles.formInput, { minHeight: 90, textAlignVertical: 'top' }]} 
                value={newPostContent}
                onChangeText={setNewPostContent}
              />
            </View>

            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsNewPostModalVisible(false)}>
                <Text style={styles.btnSecText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleCreatePost}>
                <Text style={styles.btnPriText}>Publish Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dynamic UPI Payment Modal */}
      <Modal visible={isUpiModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalWindow} style={{ width: '85%', padding: 24, backgroundColor: '#121a2c', borderRadius: 16, borderHeight: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 }}>⚡ Fitmaniac Instant UPI Pay</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 15 }}>Scan the dynamic BHIM UPI QR Code or complete the payment below.</Text>
            
            {/* Dynamic MOCK QR Code Graphics */}
            <View style={{ width: 140, height: 140, padding: 10, backgroundColor: '#ffffff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
              {/* Dynamic QR Pixel representation */}
              <View style={{ width: '100%', height: '100%', borderStyle: 'dashed', borderWidth: 2, borderColor: '#000000', padding: 5, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>📱</Text>
                <Text style={{ fontSize: 8, color: '#000000', fontWeight: 'bold', marginTop: 4 }}>UPI: pay@fitmaniac</Text>
              </View>
            </View>

            <Text style={{ fontSize: 18, color: '#38ef7d', fontWeight: 'bold' }}>₹{upiAmount.toLocaleString('en-IN')}</Text>
            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, marginBottom: 20 }}>Ref ID: FITMANIAC-UPI-${Date.now().toString().slice(-6)}</Text>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity 
                style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setIsUpiModalVisible(false)}
              >
                <Text style={{ color: '#ffffff', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1.5, backgroundColor: '#38ef7d', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={handleVerifyUpiPayment}
              >
                <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 12 }}>Verify Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Streak Milestones Modal */}
      <Modal visible={isMilestonesModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalWindow, { width: '85%', padding: 24, backgroundColor: panelBg, borderWidth: 1, borderColor: borderLight }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor, marginBottom: 6, textAlign: 'center' }}>🏆 Fitmaniac Streak Achievements</Text>
            <Text style={{ fontSize: 11, color: mutedColor, textAlign: 'center', marginBottom: 20 }}>Consistency beats intensity. Hit check-in milestones to unlock exclusive gate badges!</Text>
            
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: isLight ? 'rgba(56, 239, 125, 0.08)' : 'rgba(56, 239, 125, 0.1)', borderWidth: 1, borderColor: '#38ef7d', borderRadius: 8 }}>
                <View>
                  <Text style={{ fontSize: 12, color: textColor, fontWeight: 'bold' }}>🥉 Bronze Level (5 Days)</Text>
                  <Text style={{ fontSize: 10, color: mutedColor, marginTop: 2 }}>Reward: Bronze Gate Badge & Free shaker</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#38ef7d', fontWeight: 'bold' }}>Progress: {workoutStreak}/5</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: borderLight, borderRadius: 8 }}>
                <View>
                  <Text style={{ fontSize: 12, color: workoutStreak >= 10 ? textColor : mutedColor, fontWeight: 'bold' }}>🥈 Silver Level (10 Days)</Text>
                  <Text style={{ fontSize: 10, color: mutedColor, marginTop: 2 }}>Reward: Silver Gate Badge & Trainer session</Text>
                </View>
                <Text style={{ fontSize: 11, color: workoutStreak >= 10 ? '#38ef7d' : mutedColor, fontWeight: workoutStreak >= 10 ? 'bold' : 'normal' }}>
                  {workoutStreak >= 10 ? 'Unlocked' : 'Locked'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: borderLight, borderRadius: 8 }}>
                <View>
                  <Text style={{ fontSize: 12, color: workoutStreak >= 30 ? textColor : mutedColor, fontWeight: 'bold' }}>🥇 Gold Legend (30 Days)</Text>
                  <Text style={{ fontSize: 10, color: mutedColor, marginTop: 2 }}>Reward: Gold Legend Badge & Special class</Text>
                </View>
                <Text style={{ fontSize: 11, color: workoutStreak >= 30 ? '#38ef7d' : mutedColor, fontWeight: workoutStreak >= 30 ? 'bold' : 'normal' }}>
                  {workoutStreak >= 30 ? 'Unlocked' : 'Locked'}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: '#00f2fe', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
              onPress={() => setIsMilestonesModalVisible(false)}
            >
              <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 12 }}>Keep Crushing It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dynamic Segment Challenge Log Attempt Modal */}
      <Modal visible={isAttemptModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalWindow, { width: '85%', padding: 24, backgroundColor: '#121a2c', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 6, textAlign: 'center' }}>⏱️ Record Segment Time</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>
              Enter your completed time for {selectedChallengeForAttempt?.title || 'this challenge'}.
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 24, width: '100%' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', marginBottom: 6 }}>MINUTES</Text>
                <TextInput 
                  placeholder="e.g. 12" 
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={3}
                  style={styles.formInput}
                  value={attemptMinutes}
                  onChangeText={setAttemptMinutes}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold', marginBottom: 6 }}>SECONDS</Text>
                <TextInput 
                  placeholder="e.g. 45" 
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={2}
                  style={styles.formInput}
                  value={attemptSeconds}
                  onChangeText={setAttemptSeconds}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity 
                style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => { setIsAttemptModalVisible(false); setAttemptMinutes(''); setAttemptSeconds(''); }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1.5, backgroundColor: '#00f2fe', paddingVertical: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                onPress={handleLogAttempt}
                disabled={attemptLoading}
              >
                {attemptLoading ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 12 }}>⏱️ Record Time</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0e17',
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: 'rgba(18, 26, 44, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#00f2fe',
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  logoCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderWidth: 1.5,
    borderColor: '#00f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoText: {
    fontSize: 30,
  },
  loginBrand: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Outfit',
    letterSpacing: 1.5,
  },
  loginBrandMuted: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  loginTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Outfit',
    marginBottom: 6,
  },
  loginDesc: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 25,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 8, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ff0844',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff4d6d',
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputTip: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 6,
  },
  otpInputText: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 10,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    color: '#6b7280',
    fontSize: 11,
    paddingHorizontal: 12,
    fontWeight: 'bold',
  },
  btnBypass: {
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 254, 0.4)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnBypassText: {
    color: '#00f2fe',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  container: {
    padding: 20,
    paddingTop: 10
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#121a2c',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  navTabBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeNavTab: {
    borderBottomColor: '#00f2fe',
  },
  navTabLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  activeNavLabel: {
    color: '#00f2fe',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10
  },
  headerSubtitle: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 2,
  },
  membershipBadge: {
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: '#00f2fe',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  membershipText: {
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: 'bold',
  },
  glassPanel: {
    backgroundColor: 'rgba(18, 26, 44, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  panelTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    color: '#ff0844',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scanButton: {
    backgroundColor: '#00f2fe',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00f2fe',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  checkoutBg: {
    backgroundColor: '#ff0844',
  },
  scanButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotCard: {
    width: '48%',
    backgroundColor: 'rgba(10, 14, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  selectedSlotCard: {
    borderColor: '#00f2fe',
    backgroundColor: 'rgba(0, 242, 254, 0.05)',
  },
  slotText: {
    color: '#f3f4f6',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedSlotText: {
    color: '#00f2fe',
  },
  slotStatus: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 4,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  classTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  classMeta: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
  },
  classTime: {
    color: '#f6d365',
    fontSize: 11,
    marginTop: 4,
  },
  classBookBtn: {
    backgroundColor: '#4facfe',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  enrolledBtn: {
    backgroundColor: 'rgba(56, 239, 125, 0.15)',
    borderWidth: 1,
    borderColor: '#38ef7d',
  },
  classBookBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postTriggerBtn: {
    backgroundColor: 'rgba(10, 14, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
  },
  postTriggerBtnText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarMock: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarChar: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forumPoster: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  forumMeta: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 1,
  },
  forumTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 22,
    marginBottom: 8,
  },
  forumContent: {
    color: '#f3f4f6',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  forumActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  likedAction: {
    backgroundColor: 'rgba(255, 8, 68, 0.1)',
  },
  actionBtnText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  likedText: {
    color: '#ff0844',
  },
  commentCountText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  commentSection: {
    backgroundColor: 'rgba(10, 14, 23, 0.4)',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  commentCard: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    paddingBottom: 8,
  },
  commentAuthor: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentContent: {
    color: '#e5e7eb',
    fontSize: 12,
    marginTop: 3,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 23, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
  },
  sendCommentBtn: {
    backgroundColor: '#00f2fe',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendCommentBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  formInput: {
    width: '100%',
    backgroundColor: 'rgba(10, 14, 23, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWindow: {
    backgroundColor: '#121a2c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    width: '90%',
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modalDesc: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  viewFinder: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#00f2fe',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  laserLine: {
    position: 'absolute',
    width: '90%',
    height: 2,
    backgroundColor: '#ff0844',
  },
  barcodeId: {
    color: 'rgba(255,255,255,0.2)',
    position: 'absolute',
    bottom: 10,
    fontSize: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
  },
  btnSecText: {
    color: '#ffffff',
    fontSize: 13,
  },
  btnPrimary: {
    backgroundColor: '#00f2fe',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
  },
  btnPriText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  }
});
