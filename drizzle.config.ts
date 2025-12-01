
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

console.log('DB URL:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));

export default {
    schema: './lib/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
};
