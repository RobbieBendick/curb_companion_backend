import mongoose, { Document, Schema } from 'mongoose';
import { REFRESH_JWT_EXPIRATION } from '../config/constants';

// Define the interface for the document
export interface RefreshTokenDocument extends Document {
  token: string;
  deviceId: string;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
}

// Define the schema
export const refreshTokenSchema = new Schema<RefreshTokenDocument>({
  token: {
    type: String,
    maxlength: 1024,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  deviceId: {
    type: String,
  },
  createdAt: {
    type: Date,
    expires: REFRESH_JWT_EXPIRATION,
    default: Date.now,
  },
});

// Create and export the model
const RefreshToken = mongoose.model<RefreshTokenDocument>('RefreshTokens', refreshTokenSchema);

export default RefreshToken;
