import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for the document
export interface VendorDocument extends Document {
  title: string;
  profileImage: string;
  phoneNumber: string;
  website: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  catering: boolean;
}

// Define the schema
export const vendorSchema = new Schema<VendorDocument>({
  title: {
    type: String,
    required: true,
    unique: false,
  },
  profileImage: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: false,
  },
  website: {
    type: String,
    required: false,
  },
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
  catering: {
    type: Boolean,
    required: true,
  },
});

// Create and export the model
const VendorDoc = mongoose.model<VendorDocument>('LandingVendors', vendorSchema);

export default VendorDoc;
