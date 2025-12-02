
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function fix() {
    try {
        console.log('Dropping enum types...');
        // Try dropping in outlinefactory schema
        await db.execute(sql`DROP TYPE IF EXISTS outlinefactory.role CASCADE;`);
        await db.execute(sql`DROP TYPE IF EXISTS outlinefactory.subscription_tier CASCADE;`);

        // Also try public just in case
        await db.execute(sql`DROP TYPE IF EXISTS public.role CASCADE;`);
        await db.execute(sql`DROP TYPE IF EXISTS public.subscription_tier CASCADE;`);

        console.log('Types dropped.');
    } catch (error) {
        console.error('Fix failed:', error);
    }
    process.exit(0);
}

fix();
