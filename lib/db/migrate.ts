import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
    const migrationsFolder = path.join(process.cwd(), 'drizzle');
    await migrate(db, { migrationsFolder });
    await pool.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
