import mongoose, { Schema, Document } from 'mongoose';

export interface IComment {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  content: string;
  createdAt: Date;
}

export interface ICommunityPost extends Document {
  gymId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  title: string;
  content: string;
  likes: mongoose.Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
}

const CommentSchema: Schema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const CommunityPostSchema: Schema = new Schema({
  gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],
  comments: [CommentSchema],
  createdAt: { type: Date, default: Date.now }
});

// Index to quickly fetch posts for a specific gym's community
CommunityPostSchema.index({ gymId: 1, createdAt: -1 });

export const CommunityPost = mongoose.models.CommunityPost || mongoose.model<ICommunityPost>('CommunityPost', CommunityPostSchema);
