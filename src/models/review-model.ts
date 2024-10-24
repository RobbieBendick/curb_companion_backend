import { Schema, model } from 'mongoose';
import IReview from '../shared/interfaces/review';

export const reviewSchema: Schema<IReview> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    images: {
      type: [String],
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

reviewSchema.virtual('firstName', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName' },
});

reviewSchema.virtual('surname', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'surname' },
});

const Review = model<IReview>('Review', reviewSchema);
export default Review;
