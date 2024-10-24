import winston from 'winston';
import { MongoDB } from 'winston-mongodb';

const format = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  return `${timestamp} ${level} [${meta.namespace}] ${message}`;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  format,
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.colorize(),
  format,
);

const mongoFormat = winston.format.combine(winston.format.errors({ stack: true }), winston.format.metadata());

const Logger = winston.createLogger({
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: 'src/server/logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
    }),
    new winston.transports.File({
      filename: 'src/server/logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
    }),
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
    }),
  ],
});
export async function addMongoDbTransport(db: string) {
  Logger.add(
    new MongoDB({
      db: db,
      collection: 'combined-logs',
      format: mongoFormat,
      options: { useNewUrlParser: true, useUnifiedTopology: true },
    }),
  );
  Logger.add(
    new MongoDB({
      db: db,
      collection: 'error-logs',
      level: 'error',
      format: mongoFormat,
      options: { useNewUrlParser: true, useUnifiedTopology: true },
    }),
  );
}

export default Logger;
