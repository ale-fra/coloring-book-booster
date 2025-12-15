import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const TARGET_EMAIL = 'alessandro@francialabs.com';

async function main() {
    console.log(`Promoting user ${TARGET_EMAIL} to admin...`);

    const result = await db.update(users)
        .set({ role: 'admin', isAdmin: true })
        .where(eq(users.email, TARGET_EMAIL))
        .returning();

    if (result.length > 0) {
        console.log('Success! User updated:', result[0]);
    } else {
        console.error('Error: User not found.');
    }

    process.exit(0);
}

main().catch(console.error);
