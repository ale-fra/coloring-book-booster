"use server";

import { db } from '@/lib/db/drizzle';
import { aiLogs } from '@/lib/db/schema';
import { auth } from '@/auth';

export async function logAIInteraction(
    provider: string,
    model: string,
    input: any,
    output: any,
    status: 'success' | 'error',
    durationMs: number,
    userId?: string
) {
    try {
        let finalUserId = userId;

        // If running on server and no userId provided, try to fetch from session
        if (!finalUserId) {
            try {
                const session = await auth();
                finalUserId = session?.user?.id;
            } catch (e) {
                // Ignore auth errors (e.g. if called outside request context)
            }
        }

        await db.insert(aiLogs).values({
            provider,
            model,
            input: typeof input === 'string' ? input : JSON.stringify(input),
            output: typeof output === 'string' ? output : JSON.stringify(output),
            status,
            durationMs,
            userId: finalUserId,
        });
    } catch (error) {
        console.error('Failed to log AI interaction:', error);
        // Fail silently to not disrupt the main flow
    }
}
