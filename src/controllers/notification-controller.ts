import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { getUserID } from '../middleware/jwt';
import Notification from '../models/notification-model';
import User from '../models/user-model';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import INotification from '../shared/interfaces/notification';

const baseNamespace: string = 'notification-controller';

export async function getNotifications(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.getNotifications`;
  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 });
    if (notifications === undefined || notifications.length == 0) {
      return sendResponse({ req, res, namespace, ...ResponseInfo.notificationsFound });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.notificationsFound, data: notifications });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function readNotification(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.readNotification`;
  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.notificationNotFound });
    }

    if (notification.userId.toString() !== user._id.toString()) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    notification.read = true;
    await notification.save();

    return sendResponse({ req, res, namespace, ...ResponseInfo.notificationFound, data: notification });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

// Temporary route for testing notifications
export async function testNotifications(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.testNotifications`;
  try {
    const inotification: INotification = {
      title: req.body.title,
      body: req.body.body,
      route: req.body.route,
      read: false,
      // imageUrl: req.body.imageUrl,
      userId: req.body.userId,
      createdAt: new Date(),
    };

    const notification = await Notification.create(inotification);
    await notification.save();

    const user = await User.findById(req.body.userId);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (user && user.deviceToken) {
      // TODO: Move this to another file
      await admin.messaging().sendEachForMulticast({
        tokens: [user.deviceToken],
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: 'notification',
          route: notification.route,
        },
        apns: {
          payload: {
            aps: {
              android_channel_id: 'high_importance_channel',
              sound: 'default',
              priority: 'high',
              alert: {
                title: notification.title,
                body: notification.body,
              },
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
        },
      });
      return sendResponse({ req, res, namespace, ...ResponseInfo.notificationSent, data: notification });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.deviceTokenNotFound });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
