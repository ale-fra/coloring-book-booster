
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('Starting manual migration...');

        // Create types if they don't exist
        console.log('Creating types...');
        try {
            await db.execute(sql`CREATE TYPE outlinefactory.role AS ENUM ('admin', 'member');`);
        } catch (e: any) {
            console.log('Type role might already exist:', e.message);
        }

        try {
            await db.execute(sql`CREATE TYPE outlinefactory.subscription_tier AS ENUM ('starter', 'pro', 'max');`);
        } catch (e: any) {
            console.log('Type subscription_tier might already exist:', e.message);
        }

        // Add columns
        console.log('Adding columns...');
        try {
            await db.execute(sql`ALTER TABLE outlinefactory.users ADD COLUMN role outlinefactory.role NOT NULL DEFAULT 'member';`);
            console.log('Added role column.');
        } catch (e: any) {
            console.log('Failed to add role column (maybe exists):', e.message);
        }

        try {
            await db.execute(sql`ALTER TABLE outlinefactory.users ADD COLUMN subscription_tier outlinefactory.subscription_tier NOT NULL DEFAULT 'starter';`);
            console.log('Added subscription_tier column.');
        } catch (e: any) {
            console.log('Failed to add subscription_tier column (maybe exists):', e.message);
        }

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
