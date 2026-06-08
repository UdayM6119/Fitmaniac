import { Hono } from 'hono';
import { Customer } from '../models/Customer.js';
import { Gym } from '../models/Gym.js';
import { CheckInHistory } from '../models/CheckInHistory.js';
import { SpecialClass } from '../models/SpecialClass.js';
import { CommunityPost } from '../models/CommunityPost.js';
import { Challenge } from '../models/Challenge.js';
import { isValidObjectId } from 'mongoose';

const customerApp = new Hono();

// Helper: format YYYY-MM-DD
const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 1. QR/Barcode Scan Endpoint (Check-In & Check-Out)
customerApp.post('/scan', async (c) => {
  try {
    const body = await c.req.json();
    const { customerId, barcodeToken } = body;

    if (!customerId || !barcodeToken) {
      return c.json({ success: false, message: 'Customer ID and Barcode token are required.' }, 400);
    }

    if (!isValidObjectId(customerId)) {
      return c.json({ success: false, message: 'Invalid Customer ID format.' }, 400);
    }

    // A. Find Gym
    const gym = await Gym.findOne({ barcodeToken });
    if (!gym) {
      return c.json({ success: false, message: 'Invalid QR/Barcode scanner code.' }, 404);
    }

    // B. Find Customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return c.json({ success: false, message: 'Customer profile not found.' }, 404);
    }

    // C. Strict Gym Locking (No Cross-Gym Access)
    if (customer.gymId.toString() !== gym._id.toString()) {
      return c.json({ 
        success: false, 
        message: `Check-in denied! You are registered at ${customer.name}'s home gym. Cross-gym visits are disabled.` 
      }, 403);
    }

    // D. Subscription Validation
    const now = new Date();
    const isSubscribed = customer.subscription.status === 'Active' && now >= customer.subscription.startDate && now <= customer.subscription.endDate;
    
    let usedCarryForward = false;

    if (!isSubscribed) {
      // Check if we can use carry-forward absent days
      if (customer.carryForwardDays > 0) {
        usedCarryForward = true;
      } else {
        return c.json({ 
          success: false, 
          message: 'Check-in blocked! Your subscription has expired. Please contact the Gym Owner to renew.' 
        }, 403);
      }
    }

    // E. Evaluate Check-In vs Check-Out
    const dateStr = getLocalDateString(now);

    // Look for an open session (check-in exists, but checkout is null)
    let openSession = await CheckInHistory.findOne({
      customerId: customer._id,
      gymId: gym._id,
      checkOutTime: { $exists: false }
    });

    if (openSession) {
      // Perform Check-Out
      const checkOutTime = now;
      const durationMs = checkOutTime.getTime() - openSession.checkInTime.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000)); // Minimum 1 minute

      openSession.checkOutTime = checkOutTime;
      openSession.durationMinutes = durationMinutes;
      await openSession.save();

      return c.json({
        success: true,
        type: 'Check-Out',
        message: `Successfully checked out of ${gym.name}!`,
        session: {
          checkIn: openSession.checkInTime,
          checkOut: checkOutTime,
          duration: `${durationMinutes} minutes`
        }
      });
    } else {
      // Perform Check-In
      // If we used a carry-forward day, deduct it from customer accumulator on initial check-in
      if (usedCarryForward) {
        customer.carryForwardDays -= 1;
        await customer.save();
      }

      const newSession = new CheckInHistory({
        customerId: customer._id,
        gymId: gym._id,
        checkInTime: now,
        dateString: dateStr
      });

      await newSession.save();

      return c.json({
        success: true,
        type: 'Check-In',
        message: `Welcome to ${gym.name}! Check-in registered successfully.`,
        session: {
          checkIn: newSession.checkInTime,
          carryForwardDaysRemaining: customer.carryForwardDays
        }
      });
    }
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 2. Select 2-Hour Flexible Gym Slot
customerApp.post('/select-slot', async (c) => {
  try {
    const body = await c.req.json();
    const { customerId, start, end } = body;

    if (!customerId || !start || !end) {
      return c.json({ success: false, message: 'Customer ID, start, and end times are required.' }, 400);
    }

    if (!isValidObjectId(customerId)) {
      return c.json({ success: false, message: 'Invalid Customer ID format.' }, 400);
    }

    // Standard hours verification if required, e.g. difference is ~2 hours
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { selectedWorkoutSlot: { start, end } },
      { new: true }
    );

    if (!customer) {
      return c.json({ success: false, message: 'Customer not found.' }, 404);
    }

    return c.json({ 
      success: true, 
      message: `Workout slot set to ${start} - ${end} successfully.`,
      selectedWorkoutSlot: customer.selectedWorkoutSlot 
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Enroll in a Special Class
customerApp.post('/special-classes/:classId/enroll', async (c) => {
  const classId = c.req.param('classId');
  if (!isValidObjectId(classId)) {
    return c.json({ success: false, message: 'Invalid Class ID format.' }, 400);
  }

  try {
    const body = await c.req.json();
    const { customerId } = body;

    if (!customerId || !isValidObjectId(customerId)) {
      return c.json({ success: false, message: 'Valid Customer ID is required.' }, 400);
    }

    const specialClass = await SpecialClass.findById(classId);
    if (!specialClass) {
      return c.json({ success: false, message: 'Special training class not found.' }, 404);
    }

    // Verify if already registered
    const customerObjId = customerId as any;
    if (specialClass.enrolledCustomers.some((id: any) => id.toString() === customerId)) {
      return c.json({ success: false, message: 'You are already registered for this special class.' }, 400);
    }

    // Capacity check
    if (specialClass.enrolledCustomers.length >= specialClass.capacity) {
      return c.json({ success: false, message: 'Class is full! Unable to enroll.' }, 400);
    }

    specialClass.enrolledCustomers.push(customerObjId);
    await specialClass.save();

    return c.json({ 
      success: true, 
      message: 'Enrolled in special class successfully!',
      specialClass 
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Retrieve Customer Analytics (Weekly, Monthly, Yearly Duration Logs)
customerApp.get('/analytics/:customerId', async (c) => {
  const customerId = c.req.param('customerId');
  if (!isValidObjectId(customerId)) {
    return c.json({ success: false, message: 'Invalid Customer ID format.' }, 400);
  }

  try {
    const customer = await Customer.findById(customerId).populate('gymId');
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found.' }, 404);
    }

    // Fetch all logs
    const history = await CheckInHistory.find({ customerId, checkOutTime: { $exists: true } });

    // Calculate aggregated duration
    let totalMinutes = 0;
    let thisWeekMinutes = 0;
    let thisMonthMinutes = 0;

    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    history.forEach(log => {
      const minutes = log.durationMinutes || 0;
      totalMinutes += minutes;

      const logTime = new Date(log.checkInTime);
      if (logTime >= startOfWeek) {
        thisWeekMinutes += minutes;
      }
      if (logTime >= startOfMonth) {
        thisMonthMinutes += minutes;
      }
    });

    return c.json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        gymName: (customer.gymId as any)?.name || 'Partner Gym',
        carryForwardDays: customer.carryForwardDays,
        subscriptionExpiry: customer.subscription.endDate
      },
      stats: {
        totalWorkouts: history.length,
        duration: {
          totalMinutes,
          thisWeekMinutes,
          thisMonthMinutes
        }
      },
      attendanceHistory: history.slice(0, 10) // Send last 10 sessions
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 5. Publish Community Post
customerApp.post('/community/posts', async (c) => {
  try {
    const body = await c.req.json();
    const { customerId, title, content } = body;

    if (!customerId || !title || !content) {
      return c.json({ success: false, message: 'Customer ID, Title and Content are required.' }, 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found.' }, 404);
    }

    const newPost = new CommunityPost({
      gymId: customer.gymId,
      customerId,
      customerName: customer.name,
      title,
      content,
      likes: [],
      comments: []
    });

    await newPost.save();
    return c.json({ success: true, post: newPost }, 201);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 6. Fetch Gym-Locked Community Posts
customerApp.get('/community/posts', async (c) => {
  const gymId = c.req.query('gymId');
  if (!gymId || !isValidObjectId(gymId)) {
    return c.json({ success: false, message: 'Valid gymId is required.' }, 400);
  }

  try {
    const posts = await CommunityPost.find({ gymId }).sort({ createdAt: -1 });
    return c.json({ success: true, count: posts.length, posts });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 7. Toggle Like on Post
customerApp.post('/community/posts/:postId/like', async (c) => {
  const postId = c.req.param('postId');
  if (!isValidObjectId(postId)) {
    return c.json({ success: false, message: 'Invalid Post ID.' }, 400);
  }

  try {
    const body = await c.req.json();
    const { customerId } = body;

    if (!customerId || !isValidObjectId(customerId)) {
      return c.json({ success: false, message: 'Valid Customer ID is required.' }, 400);
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return c.json({ success: false, message: 'Post not found.' }, 404);
    }

    const index = post.likes.indexOf(customerId);
    if (index > -1) {
      // Unlike
      post.likes.splice(index, 1);
    } else {
      // Like
      post.likes.push(customerId);
    }

    await post.save();
    return c.json({ success: true, likesCount: post.likes.length, isLiked: index === -1 });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 8. Comment on Community Post
customerApp.post('/community/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId');
  if (!isValidObjectId(postId)) {
    return c.json({ success: false, message: 'Invalid Post ID.' }, 400);
  }

  try {
    const body = await c.req.json();
    const { customerId, content } = body;

    if (!customerId || !content) {
      return c.json({ success: false, message: 'Customer ID and comment content are required.' }, 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found.' }, 404);
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return c.json({ success: false, message: 'Post not found.' }, 404);
    }

    post.comments.push({
      customerId,
      customerName: customer.name,
      content,
      createdAt: new Date()
    });

    await post.save();
    return c.json({ success: true, comments: post.comments });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 9. OTP Login Request
customerApp.post('/login-request', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ success: false, message: 'Email address is required.' }, 400);
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return c.json({ 
        success: false, 
        message: 'This email is not registered under any partner gym. Please ask your gym owner to register you.' 
      }, 404);
    }

    // Generate secure 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    customer.tempOtp = otp;
    customer.tempOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    await customer.save();

    console.log(`🔑 Secure Login OTP generated for ${email}: ${otp}`);

    return c.json({ 
      success: true, 
      message: 'Secure Magic OTP sent successfully!',
      otp // Return the OTP in body for ease of mock testing and rapid developer preview!
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 10. OTP Login Verify
customerApp.post('/login-verify', async (c) => {
  try {
    const body = await c.req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return c.json({ success: false, message: 'Email and OTP code are required.' }, 400);
    }

    const customer = await Customer.findOne({ email }).populate('gymId');
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found.' }, 404);
    }

    const now = new Date();
    const isValid = customer.tempOtp === otp && customer.tempOtpExpiry && customer.tempOtpExpiry > now;

    if (!isValid) {
      return c.json({ success: false, message: 'Invalid or expired OTP. Please try requesting a new code.' }, 400);
    }

    // Clear temp OTP
    customer.tempOtp = undefined;
    customer.tempOtpExpiry = undefined;
    await customer.save();

    return c.json({
      success: true,
      message: 'Verified successfully! Logged in.',
      token: `MOCK_JWT_TOKEN_${customer._id}`,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        gymId: customer.gymId,
        carryForwardDays: customer.carryForwardDays,
        subscription: customer.subscription,
        selectedWorkoutSlot: customer.selectedWorkoutSlot
      }
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 11. Fetch Gym Segment Challenges
customerApp.get('/challenges', async (c) => {
  const gymId = c.req.query('gymId');
  if (!gymId || !isValidObjectId(gymId)) {
    return c.json({ success: false, message: 'Valid gymId is required.' }, 400);
  }

  try {
    const challenges = await Challenge.find({ gymId, isActive: true }).sort({ createdAt: -1 });
    return c.json({ success: true, count: challenges.length, challenges });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 12. Submit Gym Segment Challenge Attempt
customerApp.post('/challenges/:id/attempt', async (c) => {
  const challengeId = c.req.param('id');
  if (!isValidObjectId(challengeId)) {
    return c.json({ success: false, message: 'Invalid Challenge ID format.' }, 400);
  }

  try {
    const body = await c.req.json();
    const { customerId, minutes, seconds } = body;

    if (!customerId || !isValidObjectId(customerId)) {
      return c.json({ success: false, message: 'Valid Customer ID is required.' }, 400);
    }

    if (minutes === undefined || seconds === undefined) {
      return c.json({ success: false, message: 'Completed minutes and seconds are required.' }, 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found.' }, 404);
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return c.json({ success: false, message: 'Challenge not found.' }, 404);
    }

    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Check if customer already has an entry. If they do, only keep their BEST attempt (lowest seconds)
    const existingIndex = challenge.leaderboard.findIndex((entry: any) => entry.customerId.toString() === customerId);

    if (existingIndex > -1) {
      if (totalSeconds < challenge.leaderboard[existingIndex].seconds) {
        // Update existing entry with better time
        challenge.leaderboard[existingIndex].seconds = totalSeconds;
        challenge.leaderboard[existingIndex].timeString = timeString;
        challenge.leaderboard[existingIndex].recordedAt = new Date();
      }
    } else {
      // Add new entry
      challenge.leaderboard.push({
        customerId,
        customerName: customer.name,
        timeString,
        seconds: totalSeconds,
        recordedAt: new Date()
      });
    }

    // Sort leaderboard ascending by seconds
    challenge.leaderboard.sort((a: any, b: any) => a.seconds - b.seconds);

    await challenge.save();
    return c.json({ success: true, leaderboard: challenge.leaderboard });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default customerApp;
