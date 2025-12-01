
import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('Adding model_preferences column...');
        await db.execute(sql`
            ALTER TABLE outlinefactory.user_settings 
            ADD COLUMN IF NOT EXISTS model_preferences jsonb DEFAULT '{}'::jsonb;
        `);
        console.log('Added model_preferences.');

        console.log('Dropping aspect_ratio column...');
        await db.execute(sql`
            ALTER TABLE outlinefactory.user_settings 
            DROP COLUMN IF EXISTS aspect_ratio;
        `);
        console.log('Dropped aspect_ratio.');

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
