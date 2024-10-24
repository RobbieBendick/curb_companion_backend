import mongoose, { Model, Schema, model } from 'mongoose';
import IImage from '../shared/interfaces/image';

interface IImageMethods {
  // setLocation(location: ILocation): Promise<void>;
}

export type ImageModel = Model<IImage, {}, IImageMethods>;

export const imageSchema: Schema<IImage, ImageModel, IImageMethods> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    imageURL: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'ownerType',
      required: true,
    },
    ownerType: {
      type: String,
      enum: ['User', 'Vendor', 'MenuItem', 'Tag'],
      required: true,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: new Date(),
    },
  },
  {},
);

const Image = model<IImage>('Image', imageSchema);
export default Image;
