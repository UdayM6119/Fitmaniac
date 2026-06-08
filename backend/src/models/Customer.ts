import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  gymId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  subscription: {
    planType: 'Monthly' | 'Quarterly' | 'Yearly';
    startDate: Date;
    endDate: Date;
    pricePaid: number;
    status: 'Active' | 'Expired';
    paymentMethod: 'Online' | 'Offline';
  };
  carryForwardDays: number;
  selectedWorkoutSlot: {
    start: string; // e.g. '08:00'
    end: string;   // e.g. '10:00'
  };
  pushToken?: string;
  tempOtp?: string;
  tempOtpExpiry?: Date;
  createdAt: Date;
}

const CustomerSchema: Schema = new Schema({
  gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  subscription: {
    planType: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    pricePaid: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'Expired'], default: 'Active' },
    paymentMethod: { type: String, enum: ['Online', 'Offline'], required: true }
  },
  carryForwardDays: { type: Number, default: 0 },
  selectedWorkoutSlot: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '10:00' }
  },
  pushToken: { type: String },
  tempOtp: { type: String },
  tempOtpExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
