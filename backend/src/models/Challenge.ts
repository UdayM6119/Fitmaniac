import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardEntry {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  timeString: string; // e.g. '12:45'
  seconds: number;     // e.g. 765 (used for sorting)
  recordedAt: Date;
}

export interface IChallenge extends Document {
  gymId: mongoose.Types.ObjectId;   // Locked to the specific gym center
  title: string;                    // e.g. 'HRX 15-Min S&C Circuit'
  description: string;              // e.g. '3 Rounds for Time (Squats, Bench, Kettlebells)'
  isActive: boolean;
  leaderboard: ILeaderboardEntry[]; // Sorted by seconds ascending (lower time is better)
  createdAt: Date;
}

const ChallengeSchema: Schema = new Schema({
  gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  leaderboard: [{
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    timeString: { type: String, required: true },
    seconds: { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export const Challenge = mongoose.models.Challenge || mongoose.model<IChallenge>('Challenge', ChallengeSchema);
