import { Schema, model } from 'mongoose';
import IMenuItem from '../shared/interfaces/menu-item';
import { imageSchema } from './image-model';
import { reviewSchema } from './review-model';

export const menuItemSchema: Schema<IMenuItem> = new Schema(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    image: {
      type: imageSchema,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: false,
    },
    type: {
      type: String,
      options: ['drink', 'entree', 'side', 'dessert', 'appetizer', 'combo', 'meal'],
      required: true,
    },
    rating: {
      type: Number,
      required: false,
      default: 0,
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {},
);

const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);
export default MenuItem;
