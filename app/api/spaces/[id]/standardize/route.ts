import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { spaces } from '@/lib/db/schema';
import { OpenAIConnector } from '@/lib/openai';
import { resolveOpenAIApiKey } from '@/lib/server/keys';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const { userRequest } = await request.json();
    if (!userRequest || !params.id) {
        return NextResponse.json({ error: 'Richiesta utente e spaceId sono obbligatori' }, { status: 400 });
    }

    const apiKey = await resolveOpenAIApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'Configura una OPENAI_API_KEY nel server (.env) per usare gli Space.' }, { status: 400 });
    }

    const space = (await db.select().from(spaces).where(eq(spaces.id, params.id)))[0];
    if (!space) {
        return NextResponse.json({ error: 'Space non trovato' }, { status: 404 });
    }

    if (!space.prompt) {
        return NextResponse.json({ error: 'Space privo di Space Prompt, rigenera prima il prompt.' }, { status: 400 });
    }

    const connector = new OpenAIConnector(apiKey);
    const prompt = await connector.standardizeRequest(space.prompt, userRequest);

    return NextResponse.json({ prompt });
}
