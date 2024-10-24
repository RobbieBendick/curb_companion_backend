import express from 'express';
import { getNotifications, readNotification, testNotifications } from '../controllers/notification-controller';
import { verifyTokens } from '../middleware/jwt';
const notificationRouter = express.Router();

notificationRouter.get('/:id', verifyTokens, getNotifications);

notificationRouter.post('/send', testNotifications);

notificationRouter.get('/read/:id', verifyTokens, readNotification);

export default notificationRouter;
