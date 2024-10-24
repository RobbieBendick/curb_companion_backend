import bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import admin, { ServiceAccount } from 'firebase-admin';
import helmet from 'helmet';
import serviceAccount from '../serviceAccountKey.json';
import { connectDB } from './config/db';
import Logger from './config/log';
import bindRoutes from './routes/bind-routes';
import { ErrorResponse, sendErrorResponse } from './shared/helpers/response';
import validateEnv from './validations/env-validation';

const namespace: string = 'app';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
});

let app = express();

dotenv.config();

validateEnv();

connectDB();

app.use(cors());
app.use(cookieParser());
// app.use(globalLimiter);
app.use(express.json());
app.use(helmet());
app.use(compression());
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(bodyParser.urlencoded({ extended: true }));

// Bind routes
bindRoutes(app);

process.on('unhandledRejection', (_reason: Error | any) => {
  process.exit(1);
});

process.on('uncaughtException', (_error: Error) => {
  process.exit(1);
});

// catch 404 and forward to error handler
app.use((req: Request, res: Response, _next: NextFunction) => {
  return sendErrorResponse({ req, res, namespace, ...ErrorResponse.routeNotFound });
});

// Error handler
app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
  // Set locals, only providing error in development
  res.locals.message = error.message;
  res.locals.error = req.app.get('env') === 'development' ? error : {};

  return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
});

// Set up local host
Logger.info('Starting server', { namespace });
export let server = app.listen(parseInt(process.env.PORT!), '0.0.0.0', function () {
  Logger.log('info', `Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`, {
    namespace,
  });
});

export default app;
