import { db } from '../lib/db/drizzle';
import { aiLogs } from '../lib/db/schema';

async function main() {
    console.log('Verifying ai_logs table...');
    try {
        await db.insert(aiLogs).values({
            provider: 'test',
            model: 'test-model',
            input: 'test-input',
            output: 'test-output',
            status: 'success',
            durationMs: 0,
        });
        console.log('Successfully inserted test log into ai_logs.');
    } catch (error) {
        console.error('Failed to insert into ai_logs:', error);
    }
    process.exit(0);
}

main().catch(console.error);
