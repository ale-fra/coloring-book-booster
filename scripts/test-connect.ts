
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testConnect() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    console.log('Testing connection to:', dbUrl.replace(/:([^:@]+)@/, ':****@'));

    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Current time:', res.rows[0].now);
        await client.end();
    } catch (error) {
        console.error('Connection failed:', error);
        process.exit(1);
    }
}

testConnect();
