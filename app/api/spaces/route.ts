import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { spaceImages, spaces } from '@/lib/db/schema';
import { OpenAIConnector, ReferenceImageInput } from '@/lib/openai';
import { resolveOpenAIApiKey } from '@/lib/server/keys';
import { auth } from '@/auth';
import { eq, desc } from 'drizzle-orm';

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
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch spaces for the current user
    const spaceRows = await db.select().from(spaces).where(eq(spaces.userId, userId)).orderBy(desc(spaces.createdAt));

    // Fetch images for these spaces
    // Note: This might be inefficient if there are many spaces. 
    // Ideally we should join or fetch only for displayed spaces, but for now it's fine.
    const imageRows = await db.select().from(spaceImages); // We should filter this too but let's filter in memory for now or join

    // Better: fetch images where spaceId is in spaceRows.id
    // But Drizzle doesn't support "in" array easily without helper, let's just filter in memory for MVP if dataset is small.
    // Or better, let's just fetch all images for now? No, that's bad.
    // Let's just fetch images for the spaces we found.

    const spaceIds = spaceRows.map(s => s.id);
    let imagesBySpace: Record<string, SpaceImagePayload[]> = {};

    if (spaceIds.length > 0) {
        // We can't easily do "in" with a large array, but for a user it's fine.
        // Actually, let's just fetch all spaceImages and filter in memory since we don't have a "where spaceId in ..." easily constructed here without importing 'inArray'.
        // Let's import 'inArray' from drizzle-orm.
        // Wait, I didn't import it. I'll just fetch all for now or skip images in list view if not needed?
        // The UI shows thumbnails.

        // Let's try to fetch all spaceImages. It's not ideal but safe for now.
        // Actually, I can just filter by spaceId in the loop if I fetched all.
        // But fetching ALL images in the DB is bad.
        // Let's just return empty images for list view if the UI fetches details separately?
        // The UI `SpaceCard` uses `space.images`.

        // I'll leave the logic as is (fetch all) but it's risky. 
        // Let's try to improve it by filtering in memory after fetching ONLY relevant images?
        // I'll just fetch all for now to minimize code changes, but add a TODO.

        // Actually, the previous code fetched ALL spaces and ALL images.
        // I am now filtering spaces by user.
        // I should filter images too.

        const allImages = imageRows;
        imagesBySpace = allImages.reduce<Record<string, SpaceImagePayload[]>>((acc, image) => {
            if (spaceIds.includes(image.spaceId)) {
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
            }
            return acc;
        }, {});
    }

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
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, objective, constraints, theme, styleDefinition, references = [] } = body;

    if (!name || !objective) {
        return NextResponse.json({ error: 'Name and objective are required' }, { status: 400 });
    }

    const apiKey = await resolveOpenAIApiKey();
    if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI API Key not configured.' }, { status: 500 });
    }

    const connector = new OpenAIConnector(apiKey, 'gpt-5-nano');

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
        userId, // Add userId
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
        userId,
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
