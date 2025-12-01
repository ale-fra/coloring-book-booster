
import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Inspecting columns for table outlinefactory.users...');
    const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'outlinefactory' 
        AND table_name = 'users';
    `);

    console.log('Columns found:');
    result.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
