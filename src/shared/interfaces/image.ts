import { Types } from 'mongoose';

export default interface IImage {
  name: string;
  imageURL: string;
  owner: Types.ObjectId;
  ownerType: string;
  uploader: Types.ObjectId;
  uploadedAt: Date;
}
