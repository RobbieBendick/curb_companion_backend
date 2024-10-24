import { Types } from 'mongoose';
import IImage from './image';
import IReview from './review';

export default interface IMenuItem {
  _id: Types.ObjectId | undefined;
  vendorId: Types.ObjectId;
  title: string;
  image?: IImage;
  description: string;
  price: number;
  type: string;
  rating: number;
  reviews: IReview[];
  createdAt: Date;
}
