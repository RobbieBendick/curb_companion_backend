import { Types } from 'mongoose';
import IImage from './image';
import ILocation from './location';

// TODO: Add IP address to user model.
export default interface IUser {
  email: string;
  password?: string;
  profileImage?: IImage;
  images: IImage[];
  verified?: boolean;
  phoneNumber?: string;
  firstName?: string;
  surname?: string;
  appleId?: string;
  googleId?: string;
  dateOfBirth?: Date;
  gender?: string;
  favorites: Types.ObjectId[];
  roles: string[];
  recentlyViewedVendors: Types.ObjectId[];
  location?: ILocation;
  savedLocations: ILocation[];
  deviceToken: string;
  joinedAt?: Date;
  lastLoggedIn?: Date;
}
