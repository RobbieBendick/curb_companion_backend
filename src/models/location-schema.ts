import { Model, Schema } from 'mongoose';
import { fromAddress, fromPosition } from '../shared/helpers/geocode';
import ILocation from '../shared/interfaces/location';
import addressSchema from './address-schema';

export async function createILocation(location: any): Promise<any> {
  let locationObj: ILocation | undefined;
  if (location.address && location.coordinates) {
    locationObj = {
      coordinates: [location.coordinates['longitude'], location.coordinates['latitude']],
      address: location.address,
      type: 'Point',
    };
  } else if (location.address) {
    locationObj = await fromAddress(location.address);
  } else if (location.coordinates) {
    const coordinates = { longitude: location.coordinates[0], latitude: location.coordinates[1] };
    locationObj = await fromPosition(coordinates);
  } else {
    throw new Error('Invalid location');
  }
  if (!locationObj) throw new Error('Invalid location');
  return locationObj;
}

interface ILocationMethods {
  // setLocation(location: ILocation): Promise<void>;
}

export type LocationModel = Model<ILocation, {}, ILocationMethods>;

const locationSchema: Schema<ILocation, LocationModel, ILocationMethods> = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    address: {
      type: addressSchema,
      required: true,
    },
    accuracy: {
      type: Number,
      required: false,
    },
    altitude: {
      type: Number,
      required: false,
    },
  },
  {},
);

// locationSchema.virtual('formattedAddress').get(function () {
//   const { street, city, state, country, postalCode } = this.address;
//   return `${street}, ${city}, ${state}, ${country}, ${postalCode}`;
// });

export default locationSchema;
