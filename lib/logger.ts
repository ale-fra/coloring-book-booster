import { logAIInteraction } from '@/app/actions';

const logger = {
    info: (message: string, meta?: any) => {
        // Log to console for development visibility
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[INFO] ${message}`, meta);
        }
        // Send to server
        logAIInteraction('info', message, meta).catch(err => console.error('Log action failed', err));
    },
    error: (message: string, meta?: any) => {
        // Log to console for development visibility
        console.error(`[ERROR] ${message}`, meta);
        // Send to server
        logAIInteraction('error', message, meta).catch(err => console.error('Log action failed', err));
    }
};

export default logger;
