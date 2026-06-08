import { Hono } from 'hono';
import { Gym } from '../models/Gym.js';
import { isValidObjectId } from 'mongoose';

const adminApp = new Hono();

// 1. Add a Gym
adminApp.post('/gyms', async (c) => {
  try {
    const body = await c.req.json();
    const { name, location, barcodeToken, operatingHours, capacityPerSlot, paymentMethodsConfig } = body;

    if (!name || !location || !barcodeToken) {
      return c.json({ success: false, message: 'Name, location and unique barcode token are required.' }, 400);
    }

    // Check if barcode token is already used
    const existing = await Gym.findOne({ barcodeToken });
    if (existing) {
      return c.json({ success: false, message: 'Unique barcode token is already in use by another partner.' }, 400);
    }

    const newGym = new Gym({
      name,
      location,
      barcodeToken,
      operatingHours,
      capacityPerSlot,
      paymentMethodsConfig
    });

    await newGym.save();
    return c.json({ success: true, gym: newGym }, 201);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 2. List all Gyms
adminApp.get('/gyms', async (c) => {
  try {
    const gyms = await Gym.find().sort({ createdAt: -1 });
    return c.json({ success: true, count: gyms.length, gyms });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Update Gym details
adminApp.put('/gyms/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidObjectId(id)) {
    return c.json({ success: false, message: 'Invalid Gym ID format.' }, 400);
  }

  try {
    const body = await c.req.json();
    const updatedGym = await Gym.findByIdAndUpdate(id, body, { new: true });

    if (!updatedGym) {
      return c.json({ success: false, message: 'Gym not found.' }, 404);
    }

    return c.json({ success: true, gym: updatedGym });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Delete a Gym
adminApp.delete('/gyms/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidObjectId(id)) {
    return c.json({ success: false, message: 'Invalid Gym ID format.' }, 400);
  }

  try {
    const deleted = await Gym.findByIdAndDelete(id);
    if (!deleted) {
      return c.json({ success: false, message: 'Gym not found.' }, 404);
    }
    return c.json({ success: true, message: 'Gym removed successfully.' });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default adminApp;
