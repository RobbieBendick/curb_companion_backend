import mongoose, { Model, Schema } from 'mongoose';
import IAddress from '../shared/interfaces/address';

interface IAddressMethods {
  // setLocation(location: ILocation): Promise<void>;
}

export type AddressModel = Model<IAddress, {}, IAddressMethods>;

const addressSchema: Schema<IAddressMethods, AddressModel, IAddressMethods> = new mongoose.Schema({
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
  country: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
});

export default addressSchema;
