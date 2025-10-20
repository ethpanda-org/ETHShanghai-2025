import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaString =
            meta && Object.keys(meta).length > 0
              ? ` ${JSON.stringify(meta, null, 2)}`
              : '';
          return `${timestamp} [${level}]: ${message}${metaString}`;
        })
      ),
    }),
  ],
});
