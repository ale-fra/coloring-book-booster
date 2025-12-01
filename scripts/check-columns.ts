
import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function checkColumns() {
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'outlinefactory' 
            AND table_name = 'user_settings';
        `);
        console.log('Columns in user_settings:', result.rows);
    } catch (error) {
        console.error('Error checking columns:', error);
    }
    process.exit(0);
}

checkColumns();
