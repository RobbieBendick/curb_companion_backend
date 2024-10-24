import Logger from '../config/log';
import authRouter from './auth-router';
import cateringRouter from './catering-request';
import homeRouter from './home-router';
import landingRouter from './landing-router';
import notificationRouter from './notification-router';
import searchRouter from './search-router';
import tagRouter from './tag-router';
import userRouter from './user-router';
import vendorRouter from './vendor-router';

function routes() {
  return {
    '/api/catering': cateringRouter,
    '/api/users': userRouter,
    '/api/auth': authRouter,
    '/api/vendors': vendorRouter,
    '/api/home': homeRouter,
    '/api/tags': tagRouter,
    '/api/notifications': notificationRouter,
    '/api/search': searchRouter,
    '/api/landing': landingRouter,
  };
}

export default function bindRoutes(app: any) {
  const namespace = 'bind-routes.bindRoutes';
  try {
    Logger.info('Binding routes', { namespace });
    for (const [key, value] of Object.entries(routes())) {
      app.use(key, value);
    }
    Logger.info('Routes bound successfully', { namespace });
  } catch (error) {
    Logger.error(`Error binding routes: ${error}`, { namespace });
    process.exit(1);
  }
}
