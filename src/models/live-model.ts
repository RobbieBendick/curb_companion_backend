import { Schema, model } from 'mongoose';
import ILive from '../shared/interfaces/live';
import locationSchema from './location-schema';

const liveSchema = new Schema(
  {
    location: {
      type: locationSchema,
      required: false,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    start: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  {},
);

const Live = model<ILive>('Live', liveSchema);
export default Live;
