import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { spaceImages, spaces, appSettings } from '@/lib/db/schema';
import { OpenAIConnector, ReferenceImageInput } from '@/lib/openai';
import { resolveOpenAIApiKey } from '@/lib/server/keys';
import { auth } from '@/auth';

type SerializableValue = string | number | boolean | null | undefined | SerializableValue[] | { [key: string]: SerializableValue };

type SpaceImagePayload = {
    id: string;
    name: string | null;
    mimeType: string | null;
    dataUrl: string | null;
    analysis: string | null;
    createdAt: Date | null;
};

function normalizeContent(content: SerializableValue) {
    if (typeof content === 'string' || content === null || content === undefined) {
        return content;
    }
    return JSON.parse(JSON.stringify(content));
}

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [spaceRows, imageRows] = await Promise.all([
        db.select().from(spaces),
        db.select().from(spaceImages),
    ]);

    const imagesBySpace = imageRows.reduce<Record<string, SpaceImagePayload[]>>((acc, image) => {
        const key = image.spaceId;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
            id: image.id,
            name: image.name,
            mimeType: image.mimeType,
            dataUrl: image.dataUrl,
            analysis: image.analysis,
            createdAt: image.createdAt,
        });
        return acc;
    }, {});

    const payload = spaceRows.map((space) => ({
        ...space,
        prompt: normalizeContent(space.prompt),
        styleDefinition: normalizeContent(space.styleDefinition),
        images: imagesBySpace[space.id] || [],
    }));

    return NextResponse.json({ spaces: payload });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, objective, constraints, theme, styleDefinition, references = [] } = body;

    if (!name || !objective) {
        return NextResponse.json({ error: 'name e objective sono obbligatori' }, { status: 400 });
    }

    const apiKey = await resolveOpenAIApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'Configura una OPENAI_API_KEY nel server (.env) per creare uno Space.' }, { status: 400 });
    }

    // Fetch system prompts from app settings
    const settings = await db.select().from(appSettings).limit(1);
    const systemPrompts = {
        analysis: settings[0]?.spaceAnalysisPrompt,
        generation: settings[0]?.spaceGenerationPrompt,
    };

    const connector = new OpenAIConnector(apiKey, 'gpt-4o-mini', systemPrompts);

    const sanitizedReferences: ReferenceImageInput[] = Array.isArray(references)
        ? references.slice(0, 10).map((ref: ReferenceImageInput) => ({
            dataUrl: ref.dataUrl,
            name: ref.name,
            mimeType: ref.mimeType,
        }))
        : [];

    const analyses: string[] = [];
    const referencePayload: { id: string; dataUrl: string; mimeType?: string; name?: string; analysis?: string }[] = [];

    // Parallelize analysis
    await Promise.all(sanitizedReferences.map(async (ref) => {
        if (!ref.dataUrl) return;
        const analysis = await connector.analyzeReference(ref);
        analyses.push(analysis);
        referencePayload.push({
            id: crypto.randomUUID(),
            dataUrl: ref.dataUrl,
            mimeType: ref.mimeType,
            name: ref.name,
            analysis,
        });
    }));

    const prompt = await connector.buildSpacePrompt({
        name,
        objective,
        theme,
        constraints,
        styleDefinition,
        imageAnalyses: analyses,
    });

    const now = new Date();
    const spaceId = crypto.randomUUID();

    await db.insert(spaces).values({
        id: spaceId,
        name,
        objective,
        theme,
        constraints,
        styleDefinition,
        prompt,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
    });

    if (referencePayload.length > 0) {
        await db.insert(spaceImages).values(
            referencePayload.map((item) => ({
                id: item.id,
                spaceId,
                dataUrl: item.dataUrl,
                mimeType: item.mimeType,
                name: item.name,
                analysis: item.analysis,
                createdAt: now,
            }))
        );
    }

    const responsePayload = {
        id: spaceId,
        name,
        objective,
        theme,
        constraints,
        styleDefinition,
        prompt,
        status: 'ready',
        images: referencePayload,
        createdAt: now,
        updatedAt: now,
    };

    return NextResponse.json({ space: responsePayload }, { status: 201 });
}
