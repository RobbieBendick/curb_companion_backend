import { Types } from 'mongoose';
import ILocation from './location';

export default interface ILiveHistory {
  address?: string;
  location?: ILocation;
  vendorId?: Types.ObjectId;
  start?: Date;
  end?: Date;
}
