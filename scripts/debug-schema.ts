
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function inspect() {
    try {
        console.log('Inspecting users table columns...');
        const result = await db.execute(sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'outlinefactory' AND table_name = 'users';
        `);
        console.log(result.rows);
    } catch (error) {
        console.error('Inspection failed:', error);
    }
    process.exit(0);
}

inspect();
