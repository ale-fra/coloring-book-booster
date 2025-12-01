import 'server-only';
import winston from 'winston';
import path from 'path';

// Define log directory and file
const logDir = 'logs';
const logFile = path.join(process.cwd(), logDir, 'ai-interactions.log');
const errorFile = path.join(process.cwd(), logDir, 'error.log');

// Create the logger
const serverLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'ai-generation-service' },
    transports: [
        new winston.transports.File({ filename: errorFile, level: 'error' }),
        new winston.transports.File({ filename: logFile }),
    ],
});

// If we're not in production then log to the `console` with the format:
if (process.env.NODE_ENV !== 'production') {
    serverLogger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

export default serverLogger;
