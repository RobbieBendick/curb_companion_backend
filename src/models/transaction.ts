import mongoose, { Document, Schema, Types } from 'mongoose';

type OpType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'REPLACE';

type Collections =
  | 'AccessToken'
  | 'Event'
  | 'Image'
  | 'LandingVendors'
  | 'User'
  | 'Live'
  | 'LiveHistory'
  | 'MenuItem'
  | 'Notification'
  | 'Occurrence'
  | 'Tag'
  | 'Transaction'
  | 'Vendor'
  | 'VerificationToken';

export interface IDocumentAffected<T> {
  beforeDocument?: T;
  afterDocument?: T;
}

type Status = 'SUCCESS' | 'FAILURE';

interface ITransactionDocument extends Document {
  userId: Types.ObjectId;
  timestamp: Date;
  opType: OpType;
  collectionsAffected: Collections[];
  documentsAffected: IDocumentAffected<any>[];
  executionTime: string;
  status: Status;
  error: string;
}

const transactionSchema = new Schema<ITransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    timestamp: { type: Date, required: true },
    opType: { type: String, enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'REPLACE'], required: true },
    collectionsAffected: [
      {
        type: String,
        enum: [
          'AccessToken',
          'Event',
          'Image',
          'LandingVendors',
          'User',
          'Live',
          'LiveHistory',
          'MenuItem',
          'Notification',
          'Occurrence',
          'Tag',
          'Transaction',
          'Vendor',
          'VerificationToken',
        ],
        required: true,
      },
    ],
    documentsAffected: [
      {
        beforeDocument: Schema.Types.Mixed,
        afterDocument: Schema.Types.Mixed,
      },
    ],
    executionTime: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
    error: { type: String, required: false },
  },
  {
    timestamps: true, // If you want Mongoose to automatically manage createdAt and updatedAt timestamps
  },
);

const Transaction = mongoose.model<ITransactionDocument>('Transaction', transactionSchema);

export default Transaction;
