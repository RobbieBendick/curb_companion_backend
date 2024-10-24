import rateLimit from 'express-rate-limit';
import Logger from '../config/log';
import { time } from '../shared/helpers/math';
import { ErrorResponse, sendErrorResponse } from '../shared/helpers/response';

const globalTimer = 15;
const loginTimer = 10;
const forgotPasswordTimer = 3;
const sendEmailCodeTimer = 1;

export const globalLimiter = rateLimit({
  windowMs: time.minutesToMilliseconds(globalTimer), // 15 min in milliseconds
  max: 100,
  message: {
    error: ErrorResponse.rateLimitExceeded.error,
    errorMessage: `${ErrorResponse.rateLimitExceeded.errorMessage} Please try again after ${time.minutesToMilliseconds(
      globalTimer,
    )} minute${globalTimer > 1 ?? 's'}`,
  },
  statusCode: ErrorResponse.rateLimitExceeded.status,
  headers: true,
  handler: (req, res) => {
    Logger.warn(`Rate limit exceeded for ${req.ip}.`, {
      namespace: 'globalLimiter',
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    const namespace = 'sendEmailCodeLimiter';
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.rateLimitExceeded });
  },
});

export const loginLimiter = rateLimit({
  windowMs: time.minutesToMilliseconds(loginTimer), // 10 min in milliseconds
  max: 5,
  message: {
    error: ErrorResponse.rateLimitExceeded.error,
    errorMessage: `${ErrorResponse.rateLimitExceeded.errorMessage} Please try again after ${time.minutesToMilliseconds(
      globalTimer,
    )} minute${loginTimer > 1 ?? 's'}`,
  },
  statusCode: ErrorResponse.rateLimitExceeded.status,
  headers: true,
  handler: (req, res) => {
    Logger.warn(`Rate limit exceeded for ${req.ip}.`, {
      namespace: 'loginLimiter',
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    const namespace = 'sendEmailCodeLimiter';
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.rateLimitExceeded });
  },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: time.minutesToMilliseconds(forgotPasswordTimer), // 3 min in milliseconds
  max: 3,
  message: {
    error: ErrorResponse.rateLimitExceeded.error,
    errorMessage: `${ErrorResponse.rateLimitExceeded.errorMessage} Please try again after ${time.minutesToMilliseconds(
      globalTimer,
    )} minute${forgotPasswordTimer > 1 ?? 's'}`,
  },
  statusCode: ErrorResponse.rateLimitExceeded.status,
  headers: true,
  handler: (req, res) => {
    Logger.warn(`Rate limit exceeded for ${req.ip}.`, {
      namespace: 'forgotPasswordLimiter',
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    const namespace = 'sendEmailCodeLimiter';
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.rateLimitExceeded });
  },
});

export const sendEmailCodeLimiter = rateLimit({
  windowMs: time.minutesToMilliseconds(sendEmailCodeTimer), // 1 min in milliseconds
  max: 2,
  message: {
    error: ErrorResponse.rateLimitExceeded.error,
    errorMessage: `${ErrorResponse.rateLimitExceeded.errorMessage} Please try again after ${time.minutesToMilliseconds(
      globalTimer,
    )} minute${sendEmailCodeTimer > 1 ?? 's'}`,
  },
  statusCode: ErrorResponse.rateLimitExceeded.status,
  headers: true,
  handler: (req, res) => {
    const namespace = 'sendEmailCodeLimiter';
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.rateLimitExceeded });
  },
});
