import { Schema, model } from 'mongoose';

export interface ICateringRequest {
  email: string;
  subject: string;
  description: string;
  resolved: Boolean;
  createdAt: Date;
}

const cateringRequestSchema: Schema<ICateringRequest> = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {},
);

const CateringRequest = model<ICateringRequest>('CateringRequest', cateringRequestSchema);
export default CateringRequest;
