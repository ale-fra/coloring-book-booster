import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { spaces } from '@/lib/db/schema';
import { createTextConnector } from '@/lib/connectors/factory';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { userRequest } = await request.json();
    if (!userRequest || !id) {
        return NextResponse.json({ error: 'User request and spaceId are required' }, { status: 400 });
    }



    const space = (await db.select().from(spaces).where(eq(spaces.id, id)))[0];
    if (!space) {
        return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    if (!space.prompt) {
        return NextResponse.json({ error: 'Space missing Space Prompt, please regenerate the prompt first.' }, { status: 400 });
    }

    // System prompts are now handled internally by the connector via system_configs
    const connector = await createTextConnector();
    const prompt = await connector.standardizeRequest(space.prompt, userRequest);

    return NextResponse.json({ standardized: prompt });
}
