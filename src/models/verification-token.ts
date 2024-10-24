import { Document, Model, Schema, Types, model, models } from 'mongoose';
import { createHash } from 'node:crypto';

interface IVerificationToken {
  userId: Types.ObjectId;
  token: string;
  tokenExpiresAt?: Date;
}

interface IVerificationTokenDocument extends IVerificationToken, Document {
  // Add methods here.
  extendExpiration: () => Promise<void>;
  getCode: () => string;
}

interface VerificationTokenModel extends Model<IVerificationTokenDocument> {
  // Add static methods here.
}

const verificationTokenSchema: Schema<IVerificationTokenDocument> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      unique: true,
      immutable: true,
    },
    tokenExpiresAt: {
      type: Date,
      expires: '10m',
    },
  },
  {},
);

verificationTokenSchema.pre('save', async function (next) {
  // Create a verification token for this user

  // If there is a verification token already, delete it so we don't have duplicates
  const verificationToken = await models['VerificationToken'].findOne({ userId: this.userId });
  if (verificationToken) verificationToken.remove();

  try {
    this.token = createHash('sha256').update(this.token.toString()).digest('hex');
  } catch (error) {
    throw Error('Error creating verification token.');
  }
  next();
});

verificationTokenSchema.methods.extendExpiration = async function () {
  // Create a verification token for this user
  this.tokenExpiresAt = new Date(Date.now() + 300000);
};

export class VerificationTokenDoesNotExistError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, VerificationTokenDoesNotExistError.prototype);
  }
}

export class VerificationTokenInvalidError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, VerificationTokenInvalidError.prototype);
  }
}

export class VerificationTokenExpiredError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, VerificationTokenExpiredError.prototype);
  }
}

const VerificationToken = model<IVerificationTokenDocument, VerificationTokenModel>(
  'VerificationToken',
  verificationTokenSchema,
);
export default VerificationToken;
