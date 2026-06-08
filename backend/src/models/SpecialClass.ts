import mongoose, { Schema, Document } from 'mongoose';

export interface ISpecialClass extends Document {
  gymId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  trainerName: string;
  dateTime: Date;
  durationMinutes: number;
  capacity: number;
  enrolledCustomers: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const SpecialClassSchema: Schema = new Schema({
  gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  trainerName: { type: String, required: true },
  dateTime: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, default: 60 },
  capacity: { type: Number, required: true, default: 20 },
  enrolledCustomers: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],
  createdAt: { type: Date, default: Date.now }
});

export const SpecialClass = mongoose.models.SpecialClass || mongoose.model<ISpecialClass>('SpecialClass', SpecialClassSchema);
