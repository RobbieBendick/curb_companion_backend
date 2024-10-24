import { Types } from 'mongoose';
import ILocation from './location';

export default interface ILive {
  location?: ILocation;
  vendorId?: Types.ObjectId;
  start?: Date;
}
