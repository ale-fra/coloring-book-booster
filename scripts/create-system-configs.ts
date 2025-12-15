import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function createTable() {
    console.log('Creating system_configs table...');
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "outlinefactory"."system_configs" (
                "key" text PRIMARY KEY NOT NULL,
                "value" text NOT NULL,
                "description" text,
                "group" text
            );
        `);
        console.log('Table created successfully.');
    } catch (error) {
        console.error('Failed to create table:', error);
    }
}

createTable();
