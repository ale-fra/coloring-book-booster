
import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Adding missing is_admin column to outlinefactory.users...');

    try {
        await db.execute(sql`
            ALTER TABLE outlinefactory.users 
            ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
        `);
        console.log('Successfully added is_admin column.');
    } catch (error) {
        console.error('Error adding column:', error);
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
