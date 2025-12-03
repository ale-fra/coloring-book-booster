
import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Checking for userId column in spaces table...');
    try {
        // Check if column exists
        // This query is specific to Postgres
        const checkResult = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'outlinefactory' 
            AND table_name = 'spaces' 
            AND column_name = 'user_id';
        `);

        if (checkResult.rowCount === 0) {
            console.log('Column user_id does not exist. Adding it...');
            await db.execute(sql`
                ALTER TABLE outlinefactory.spaces 
                ADD COLUMN user_id uuid REFERENCES outlinefactory.users(id);
            `);
            console.log('Column user_id added successfully.');
        } else {
            console.log('Column user_id already exists.');
        }
    } catch (error) {
        console.error('Error updating database:', error);
    }
    process.exit(0);
}

main();
