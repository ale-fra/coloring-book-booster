
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function createDb() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    // Parse the URL to get the database name and connection info
    const url = new URL(dbUrl);
    const dbName = url.pathname.slice(1); // Remove leading slash

    // Connect to 'postgres' database to create the new database
    url.pathname = '/postgres';
    const postgresUrl = url.toString();

    console.log(`Connecting to postgres to check/create database: ${dbName}`);

    const client = new Client({
        connectionString: postgresUrl,
    });

    try {
        await client.connect();

        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created successfully.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
    } catch (error) {
        console.error('Error creating database:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createDb();
