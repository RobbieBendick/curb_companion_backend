import { Types } from 'mongoose';

export default interface INotification {
  title: string;
  body: string;
  route: string;
  imageUrl?: string;
  userId: Types.ObjectId;
  read: boolean;
  createdAt: Date;
}
