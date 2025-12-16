import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/drizzle';
import { aiLogs, users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for admin role
    // We fetch from DB to ensure we have the latest role, as session might be stale
    let isAdmin = false;

    if (session.user.role === 'admin' || session.user.isAdmin) {
        isAdmin = true;
    } else if (session.user.email) {
        // Double check DB
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, session.user.email!),
            columns: { role: true, isAdmin: true }
        });

        if (user && (user.role === 'admin' || user.isAdmin)) {
            isAdmin = true;
        }
    }

    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const logs = await db.select().from(aiLogs).orderBy(desc(aiLogs.timestamp)).limit(50);
        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Failed to fetch AI logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
