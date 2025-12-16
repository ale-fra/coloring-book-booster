import { logAIInteraction } from '@/app/actions';

import { sanitizeForLog } from '@/lib/utils';

const logger = {
    info: (message: string, meta?: any) => {
        const sanitizedMeta = sanitizeForLog(meta);
        // Log to console for development visibility
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[INFO] ${message}`, sanitizedMeta);
        }
        // Send to server
        logAIInteraction('info', message, sanitizedMeta).catch(err => console.error('Log action failed', err));
    },
    error: (message: string, meta?: any) => {
        const sanitizedMeta = sanitizeForLog(meta);
        // Log to console for development visibility
        console.error(`[ERROR] ${message}`, sanitizedMeta);
        // Send to server
        logAIInteraction('error', message, sanitizedMeta).catch(err => console.error('Log action failed', err));
    }
};

export default logger;
