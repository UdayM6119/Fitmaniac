import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckInHistory extends Document {
  customerId: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  durationMinutes?: number;
  dateString: string; // e.g. '2026-06-02'
}

const CheckInHistorySchema: Schema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  checkInTime: { type: Date, required: true, default: Date.now },
  checkOutTime: { type: Date },
  durationMinutes: { type: Number },
  dateString: { type: String, required: true }
});

// Compound index to quickly query a customer's scans on a specific date
CheckInHistorySchema.index({ customerId: 1, dateString: 1 });

export const CheckInHistory = mongoose.models.CheckInHistory || mongoose.model<ICheckInHistory>('CheckInHistory', CheckInHistorySchema);
