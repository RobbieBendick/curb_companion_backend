import { Schema, model } from 'mongoose';
import IOccurrence from '../shared/interfaces/occurrence';
import locationSchema from './location-schema';

export const occurrenceSchema: Schema<IOccurrence> = new Schema(
  {
    location: {
      type: locationSchema,
      required: false,
    },
    recurrence: {
      type: [
        {
          type: String,
        },
      ],
      default: [],
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

const Occurrence = model<IOccurrence>('Occurrence', occurrenceSchema);
export default Occurrence;
