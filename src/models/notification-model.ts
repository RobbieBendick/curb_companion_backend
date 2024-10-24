import { Document, Model, Schema, model } from 'mongoose';
import INotification from '../shared/interfaces/notification';

export interface INotificationDocument extends INotification, Document {}

interface NotificationModel extends Model<INotificationDocument> {}

const notificationSchema: Schema<INotificationDocument> = new Schema(
  {
    title: { type: String, require: true, maxlength: 64 },
    body: { type: String, require: true, maxlength: 500 },
    route: { type: String, require: true, maxlength: 64 },
    imageUrl: { type: String, require: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', require: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },

  {},
);

notificationSchema.virtual('age').get(function (this: INotificationDocument) {
  let time = Date.now() - this.createdAt.getTime();
  if (time < 60000) {
    return 'Just now';
  }
  if (time < 3600000) {
    return Math.floor(time / 60000) + ' minutes ago';
  }
  // 1 day in ms
  if (time < 86400000) {
    return Math.floor(time / 3600000) + ' hours ago';
  }
  // 1 week in ms
  if (time < 604800000) {
    return Math.floor(time / 86400000) + ' days ago';
  }
  // 1 month in ms
  if (time < 2592000000) {
    return Math.floor(time / 604800000) + ' weeks ago';
  }
  // 1 year in ms
  if (time < 31536000000) {
    return Math.floor(time / 2592000000) + ' months ago';
  }
  return Math.floor(time / 31536000000) + ' years ago';
});

notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = model<INotificationDocument, NotificationModel>('Notification', notificationSchema);
export default Notification;
