import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { connectDB } from './config/db.js';
import adminApp from './routes/admin.js';
import clientApp from './routes/client.js';
import customerApp from './routes/customer.js';
import { Gym } from './models/Gym.js';
import { Customer } from './models/Customer.js';
import { CommunityPost } from './models/CommunityPost.js';
import { Challenge } from './models/Challenge.js';

const app = new Hono();

// Middlewares
app.use('*', cors());

// Basic diagnostics route
app.get('/', (c) => {
  return c.text('🟢 Gym Fitness Partner Network API - Hono running on Node.js');
});

// Seed demo data route
app.post('/api/seed', async (c) => {
  try {
    // Clear existing
    await Gym.deleteMany({});
    await Customer.deleteMany({});
    await CommunityPost.deleteMany({});
    await Challenge.deleteMany({});

    // 1. Create a Demo Gym
    const demoGym = new Gym({
      name: 'Fitmaniac Center Koramangala',
      location: '100 Feet Road, Koramangala, Bangalore',
      barcodeToken: 'fitfreak_001',
      operatingHours: {
        open: '05:30',
        close: '22:30'
      },
      capacityPerSlot: 25,
      paymentMethodsConfig: {
        allowOnline: true,
        allowOffline: true
      }
    });
    await demoGym.save();

    // 2. Create a Active Customer linked to Gym
    const activeCustomer = new Customer({
      gymId: demoGym._id,
      name: 'Rahul Sharma',
      email: 'rahul@gmail.com',
      phone: '+91 98765 43210',
      subscription: {
        planType: 'Yearly',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Started 5 days ago
        endDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000), // Expirying next year
        pricePaid: 12999, // ₹12,999
        status: 'Active',
        paymentMethod: 'Online'
      },
      carryForwardDays: 5, // Rolled over days
      selectedWorkoutSlot: {
        start: '06:00',
        end: '08:00'
      }
    });
    await activeCustomer.save();

    // 3. Create an Expired Customer
    const expiredCustomer = new Customer({
      gymId: demoGym._id,
      name: 'Priya Patel',
      email: 'priya@gmail.com',
      phone: '+91 98765 43211',
      subscription: {
        planType: 'Monthly',
        startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // Started 35 days ago
        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
        pricePaid: 1499, // ₹1,499
        status: 'Expired',
        paymentMethod: 'Offline'
      },
      carryForwardDays: 0, // No carry-over
      selectedWorkoutSlot: {
        start: '18:00',
        end: '20:00'
      }
    });
    await expiredCustomer.save();

    // 4. Seed Community Posts
    const post1 = new CommunityPost({
      gymId: demoGym._id,
      customerId: activeCustomer._id,
      customerName: activeCustomer.name,
      title: '🏋️ Who is up for a 6:30 AM strength session tomorrow?',
      content: 'Planning to hit heavy strength & conditioning tomorrow morning in Koramangala. Looking for a workout partner to spot each other on bench press and squats!',
      likes: [],
      comments: [
        {
          customerId: expiredCustomer._id,
          customerName: expiredCustomer.name,
          content: 'Count me in Rahul! Let’s crush some heavy squats.',
          createdAt: new Date()
        }
      ]
    });
    await post1.save();

    const post2 = new CommunityPost({
      gymId: demoGym._id,
      customerId: activeCustomer._id,
      customerName: activeCustomer.name,
      title: '🥗 Carpool coordination for Zumba Masterclass',
      content: 'I have 3 empty seats on my vehicle for the upcoming Zumba Special Masterclass this Wednesday. Let me know if anyone from HSR wants a ride!',
      likes: [expiredCustomer._id],
      comments: []
    });
    await post2.save();

    // 5. Seed Gym Segment Challenges
    const challenge1 = new Challenge({
      gymId: demoGym._id,
      title: '🔥 CHALLENGE: HRX 15-Min S&C Circuit',
      description: 'Target: 3 Rounds for Time (Squats, Bench Press, Kettlebell swings)',
      isActive: true,
      leaderboard: [
        {
          customerId: expiredCustomer._id, // Priya Patel ID representing co-member
          customerName: 'Marcus Dutt',
          timeString: '12:45',
          seconds: 765,
          recordedAt: new Date()
        },
        {
          customerId: activeCustomer._id, // Rahul Sharma
          customerName: 'Rahul Sharma (You)',
          timeString: '13:12',
          seconds: 792,
          recordedAt: new Date()
        },
        {
          customerId: expiredCustomer._id, // Priya Patel
          customerName: 'Priya Patel',
          timeString: '14:05',
          seconds: 845,
          recordedAt: new Date()
        }
      ]
    });
    await challenge1.save();

    return c.json({
      success: true,
      message: 'Demo database seeded successfully (India localized).',
      gym: demoGym,
      activeCustomer,
      expiredCustomer,
      posts: [post1, post2],
      challenges: [challenge1]
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Mount Routes
app.route('/api/admin', adminApp);
app.route('/api/client', clientApp);
app.route('/api/customer', customerApp);

// Boot database & server
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

connectDB().then(() => {
  serve({
    fetch: app.fetch,
    port
  }, (info) => {
    console.log(`🚀 Hono server is running on http://localhost:${info.port}`);
  });
});

export default app;
