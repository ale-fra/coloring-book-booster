import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';

async function main() {
    const allUsers = await db.select().from(users);
    console.log('Current Users:');
    allUsers.forEach(u => {
        console.log(`- ${u.email} (Role: ${u.role}, isAdmin: ${u.isAdmin})`);
    });
    process.exit(0);
}

main().catch(console.error);
