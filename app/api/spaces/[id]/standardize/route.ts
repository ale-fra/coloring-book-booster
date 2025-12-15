import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { spaces, appSettings } from '@/lib/db/schema';
import { OpenAIConnector } from '@/lib/openai';
import { resolveOpenAIApiKey } from '@/lib/server/keys';
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

    const apiKey = await resolveOpenAIApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI API Key not configured in server (.env) to use Spaces.' }, { status: 400 });
    }

    const space = (await db.select().from(spaces).where(eq(spaces.id, id)))[0];
    if (!space) {
        return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    if (!space.prompt) {
        return NextResponse.json({ error: 'Space missing Space Prompt, please regenerate the prompt first.' }, { status: 400 });
    }

    // System prompts are now handled internally by the connector via system_configs
    const connector = new OpenAIConnector(apiKey, 'gpt-4o-mini');
    const prompt = await connector.standardizeRequest(space.prompt, userRequest);

    return NextResponse.json({ prompt });
}
