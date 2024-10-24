import { ObjectId, Types } from 'mongoose';
import IImage from './image';
import ILocation from './location';
import IMenuItem from './menu-item';
import IOccurrence from './occurrence';
import ITag from './tag';
import IReview from './review';

export default interface IVendor {
  place_id?: string;
  title: string;
  ownerId?: Types.ObjectId;
  email?: string;
  website?: string;
  phoneNumber?: string;
  profileImage?: IImage;
  images: IImage[];
  isCatering: boolean;
  views: number;
  description?: string;
  favorites: number;
  tags: ITag[];
  location?: ILocation;
  reviews: IReview[];
  rating?: number;
  menu: IMenuItem[];
  schedule: IOccurrence[];
  live: Types.ObjectId[];
  liveHistory: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorQuery {
  ownerId?: string;
  tags?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  q?: string;
  rating?: number;
  catering?: boolean;
  skip?: number;
  limit?: number;
}

export interface GenericVendorRequest {
  id: string;
}

export interface HomeQuery {
  lat?: number;
  lon?: number;
  radius?: number;
  tags?: string;
  isCatering?: boolean;
  rating?: number;
}

export interface CreateVendorRequest {
  title: string;
  isCatering: boolean;
  email?: string;
  website?: string;
  ownerId?: ObjectId;
  phoneNumber?: string;
  description?: string;
  profileImage?: any;
  images: any;
  image: any;
  menu: any;
  tags: any;
  location: any;
}

export interface AutocompleteQuery {
  q: string;
  lat: string;
  lon: string;
  radius: string;
  sessiontoken: string;
}
