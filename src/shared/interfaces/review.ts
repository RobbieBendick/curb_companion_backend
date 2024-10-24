import { Types } from 'mongoose';

export default interface IReview {
  userId: Types.ObjectId;
  title: string;
  description: string;
  rating: number;
  images: string[];
  isReported?: boolean;
  createdAt: Date;
  userFirstName?: string;
  userSurname?: string;
  populateUserDetails: () => Promise<void>;
}
