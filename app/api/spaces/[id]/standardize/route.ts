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
        return NextResponse.json({ error: 'Richiesta utente e spaceId sono obbligatori' }, { status: 400 });
    }

    const apiKey = await resolveOpenAIApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'Configura una OPENAI_API_KEY nel server (.env) per usare gli Space.' }, { status: 400 });
    }

    const space = (await db.select().from(spaces).where(eq(spaces.id, id)))[0];
    if (!space) {
        return NextResponse.json({ error: 'Space non trovato' }, { status: 404 });
    }

    if (!space.prompt) {
        return NextResponse.json({ error: 'Space privo di Space Prompt, rigenera prima il prompt.' }, { status: 400 });
    }

    // Fetch system prompts from app settings
    const settings = await db.select().from(appSettings).limit(1);
    const systemPrompts = {
        standardization: settings[0]?.spaceStandardizationPrompt,
    };

    const connector = new OpenAIConnector(apiKey, 'gpt-4o-mini', systemPrompts);
    const prompt = await connector.standardizeRequest(space.prompt, userRequest);

    return NextResponse.json({ prompt });
}
