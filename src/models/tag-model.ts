import { Schema, model } from 'mongoose';
import ITag from '../shared/interfaces/tag';
import { imageSchema } from './image-model';

export const tagSchema: Schema<ITag> = new Schema(
  {
    title: {
      type: String,
      unique: true,
    },
    image: {
      type: imageSchema,
    },
  },
  {},
);

const Tag = model<ITag>('Tag', tagSchema);
export default Tag;
