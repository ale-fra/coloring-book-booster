import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Manually creating ai_logs table...');
    try {
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS outlinefactory.ai_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp timestamp DEFAULT now(),
        provider text NOT NULL,
        model text,
        input text,
        output text,
        status text,
        duration_ms integer,
        user_id uuid
      );
    `);
        console.log('Successfully created ai_logs table.');
    } catch (error) {
        console.error('Failed to create table:', error);
    }
    process.exit(0);
}

main().catch(console.error);
