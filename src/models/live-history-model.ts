import { Schema, model } from 'mongoose';
import ILiveHistory from '../shared/interfaces/live-history';

const liveHistorySchema = new Schema(
  {
    address: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coodinates: {
        type: [Number],
      },
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    start: {
      type: Date,
    },
    end: {
      type: Date,
    },
  },
  {},
);

const LiveHistory = model<ILiveHistory>('LiveHistory', liveHistorySchema);
export default LiveHistory;
