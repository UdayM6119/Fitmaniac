import mongoose, { Schema, Document } from 'mongoose';

export interface IGym extends Document {
  name: string;
  location: string;
  barcodeToken: string;
  operatingHours: {
    open: string;  // e.g. '06:00'
    close: string; // e.g. '22:00'
  };
  capacityPerSlot: number;
  paymentMethodsConfig: {
    allowOnline: boolean;
    allowOffline: boolean;
  };
  createdAt: Date;
}

const GymSchema: Schema = new Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  barcodeToken: { type: String, required: true, unique: true },
  operatingHours: {
    open: { type: String, required: true, default: '06:00' },
    close: { type: String, required: true, default: '22:00' }
  },
  capacityPerSlot: { type: Number, required: true, default: 20 },
  paymentMethodsConfig: {
    allowOnline: { type: Boolean, required: true, default: true },
    allowOffline: { type: Boolean, required: true, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

export const Gym = mongoose.models.Gym || mongoose.model<IGym>('Gym', GymSchema);
