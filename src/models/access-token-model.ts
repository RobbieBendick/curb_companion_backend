import mongoose, { Document, Schema } from 'mongoose';
import { ACCESS_JWT_EXPIRATION } from '../config/constants';

// Define the interface for the document
export interface AccessTokenDocument extends Document {
  token: string;
  userId: Schema.Types.ObjectId;
  deviceId: string;
  createdAt: Date;
}

// Define the schema
export const accessTokenSchema = new Schema<AccessTokenDocument>({
  token: {
    type: String,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    expires: ACCESS_JWT_EXPIRATION,
    default: Date.now,
  },
});

// Create and export the model
const AccessToken = mongoose.model<AccessTokenDocument>('AccessToken', accessTokenSchema);

export default AccessToken;
