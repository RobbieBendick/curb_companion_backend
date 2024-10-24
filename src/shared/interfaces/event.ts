import { Types } from 'mongoose';
import ILocation from './location';

export default interface IEvent {
  place_id?: string;
  title: string;
  ownerId?: Types.ObjectId;
  email?: string;
  website?: string;
  phoneNumber?: string;
  image?: string;
  images?: string[];
  views?: number;
  description?: string;
  reviews?: Types.ObjectId[];
  rating?: number;
  location: ILocation;
  schedule: Types.ObjectId[];
  createdAt?: Date;
}
