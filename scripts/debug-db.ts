import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

console.log('Testing connection...');

if (!connectionString) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function testConnection() {
    try {
        await client.connect();
        console.log('CONNECTION SUCCESS: Successfully connected to the database!');
        const res = await client.query('SELECT NOW()');
        console.log('Current time from DB:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('CONNECTION FAILURE:', err);
        process.exit(1);
    }
}

testConnection();
