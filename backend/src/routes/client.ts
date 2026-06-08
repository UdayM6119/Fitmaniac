import { Hono } from 'hono';
import { Customer } from '../models/Customer.js';
import { SpecialClass } from '../models/SpecialClass.js';
import { Gym } from '../models/Gym.js';
import { Challenge } from '../models/Challenge.js';
import { isValidObjectId } from 'mongoose';

const clientApp = new Hono();

// Helper: Verify Gym exists
const verifyGym = async (gymId: string) => {
  if (!isValidObjectId(gymId)) return null;
  return await Gym.findById(gymId);
};

// 1. Add a Customer under a Gym
clientApp.post('/customers', async (c) => {
  try {
    const body = await c.req.json();
    const { gymId, name, email, phone, subscription, selectedWorkoutSlot, carryForwardDays } = body;

    const gym = await verifyGym(gymId);
    if (!gym) {
      return c.json({ success: false, message: 'Invalid or non-existent associated Gym ID.' }, 400);
    }

    if (!name || !email || !phone || !subscription) {
      return c.json({ success: false, message: 'Name, email, phone, and subscription plan details are required.' }, 400);
    }

    const existing = await Customer.findOne({ email });
    if (existing) {
      return c.json({ success: false, message: 'A customer with this email already exists.' }, 400);
    }

    // Enforce carry-forward limits: Max 30, Yearly plans only
    const plan = subscription.planType || 'Monthly';
    let carryDays = parseInt(carryForwardDays) || 0;
    if (plan !== 'Yearly') {
      carryDays = 0;
    } else if (carryDays > 30) {
      carryDays = 30;
    } else if (carryDays < 0) {
      carryDays = 0;
    }

    // Default status for new offline payment can be active or pending approval, 
    // let's set it based on input or active by default
    const newCustomer = new Customer({
      gymId,
      name,
      email,
      phone,
      subscription: {
        planType: plan,
        startDate: subscription.startDate ? new Date(subscription.startDate) : new Date(),
        endDate: subscription.endDate ? new Date(subscription.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        pricePaid: subscription.pricePaid || 0,
        status: subscription.status || 'Active',
        paymentMethod: subscription.paymentMethod || 'Offline'
      },
      carryForwardDays: carryDays,
      selectedWorkoutSlot
    });

    await newCustomer.save();
    return c.json({ success: true, customer: newCustomer }, 201);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 2. List Customers for a Specific Gym
clientApp.get('/customers', async (c) => {
  const gymId = c.req.query('gymId');
  if (!gymId || !isValidObjectId(gymId)) {
    return c.json({ success: false, message: 'Valid gymId query parameter is required.' }, 400);
  }

  try {
    const customers = await Customer.find({ gymId }).sort({ createdAt: -1 });
    return c.json({ success: true, count: customers.length, customers });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Update Customer details
clientApp.put('/customers/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidObjectId(id)) {
    return c.json({ success: false, message: 'Invalid Customer ID format.' }, 400);
  }

  try {
    const body = await c.req.json();
    const customer = await Customer.findById(id);
    if (!customer) {
      return c.json({ success: false, message: 'Customer profile not found.' }, 404);
    }

    // Validate and cap carryForwardDays if modified
    const updatedPlan = body.subscription?.planType || customer.subscription.planType;
    let carryDays = body.carryForwardDays !== undefined ? parseInt(body.carryForwardDays) : customer.carryForwardDays;

    if (updatedPlan !== 'Yearly') {
      carryDays = 0;
    } else if (carryDays > 30) {
      carryDays = 30;
    } else if (carryDays < 0) {
      carryDays = 0;
    }
    body.carryForwardDays = carryDays;

    const updatedCustomer = await Customer.findByIdAndUpdate(id, body, { new: true });
    return c.json({ success: true, customer: updatedCustomer });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Manual Subscription Renewal (Offline Approval)
clientApp.post('/customers/:id/renew-subscription', async (c) => {
  const id = c.req.param('id');
  if (!isValidObjectId(id)) {
    return c.json({ success: false, message: 'Invalid Customer ID format.' }, 400);
  }

  try {
    const body = await c.req.json();
    const { planType, pricePaid, durationMonths, carryForwardDays } = body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return c.json({ success: false, message: 'Customer not found.' }, 404);
    }

    const monthsToAdd = durationMonths || (planType === 'Yearly' ? 12 : planType === 'Quarterly' ? 3 : 1);
    
    // Calculate new start/end date
    const now = new Date();
    // If current subscription is active and not expired, extend from existing endDate, otherwise start today
    const currentEnd = new Date(customer.subscription.endDate);
    const startDate = currentEnd > now ? currentEnd : now;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    // Enforce carry forward limits
    let carryDays = carryForwardDays !== undefined ? parseInt(carryForwardDays) : customer.carryForwardDays;
    if (planType !== 'Yearly') {
      carryDays = 0;
    } else if (carryDays > 30) {
      carryDays = 30;
    } else if (carryDays < 0) {
      carryDays = 0;
    }

    customer.subscription = {
      planType: planType || 'Monthly',
      startDate,
      endDate,
      pricePaid: pricePaid || 0,
      status: 'Active',
      paymentMethod: 'Offline'
    };
    customer.carryForwardDays = carryDays;

    await customer.save();
    return c.json({ success: true, message: 'Subscription renewed offline successfully.', customer });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 5. Post a Special Class
clientApp.post('/special-classes', async (c) => {
  try {
    const body = await c.req.json();
    const { gymId, title, description, trainerName, dateTime, durationMinutes, capacity } = body;

    const gym = await verifyGym(gymId);
    if (!gym) {
      return c.json({ success: false, message: 'Valid associated Gym ID is required.' }, 400);
    }

    if (!title || !trainerName || !dateTime) {
      return c.json({ success: false, message: 'Class title, trainer name, and date/time are required.' }, 400);
    }

    const newClass = new SpecialClass({
      gymId,
      title,
      description: description || 'Special Masterclass session',
      trainerName,
      dateTime: new Date(dateTime),
      durationMinutes: durationMinutes || 60,
      capacity: capacity || 20,
      enrolledCustomers: []
    });

    await newClass.save();
    return c.json({ success: true, specialClass: newClass }, 201);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 6. List Special Classes for a Gym
clientApp.get('/special-classes', async (c) => {
  const gymId = c.req.query('gymId');
  if (!gymId || !isValidObjectId(gymId)) {
    return c.json({ success: false, message: 'Valid gymId query parameter is required.' }, 400);
  }

  try {
    const classes = await SpecialClass.find({ gymId }).sort({ dateTime: 1 });
    return c.json({ success: true, count: classes.length, specialClasses: classes });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 7. Post a Gym Segment Challenge
clientApp.post('/challenges', async (c) => {
  try {
    const body = await c.req.json();
    const { gymId, title, description } = body;

    const gym = await verifyGym(gymId);
    if (!gym) {
      return c.json({ success: false, message: 'Valid associated Gym ID is required.' }, 400);
    }

    if (!title || !description) {
      return c.json({ success: false, message: 'Challenge title and description are required.' }, 400);
    }

    const newChallenge = new Challenge({
      gymId,
      title,
      description,
      isActive: true,
      leaderboard: []
    });

    await newChallenge.save();
    return c.json({ success: true, challenge: newChallenge }, 201);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 8. List Challenges for a Gym
clientApp.get('/challenges', async (c) => {
  const gymId = c.req.query('gymId');
  if (!gymId || !isValidObjectId(gymId)) {
    return c.json({ success: false, message: 'Valid gymId query parameter is required.' }, 400);
  }

  try {
    const challenges = await Challenge.find({ gymId }).sort({ createdAt: -1 });
    return c.json({ success: true, count: challenges.length, challenges });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 9. Delete a Gym Segment Challenge
clientApp.delete('/challenges/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidObjectId(id)) {
    return c.json({ success: false, message: 'Invalid Challenge ID format.' }, 400);
  }

  try {
    const deleted = await Challenge.findByIdAndDelete(id);
    if (!deleted) {
      return c.json({ success: false, message: 'Challenge not found.' }, 404);
    }
    return c.json({ success: true, message: 'Challenge removed successfully.' });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default clientApp;
