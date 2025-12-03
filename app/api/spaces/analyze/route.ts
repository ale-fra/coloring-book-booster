import { NextResponse } from "next/server";
import { OpenAIConnector, ReferenceImageInput } from "@/lib/openai";
import { resolveOpenAIApiKey } from "@/lib/server/keys";
import { db } from "@/lib/db/drizzle";
import { appSettings } from "@/lib/db/schema";
import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, references } = body;

        if (!name || !references || !Array.isArray(references) || references.length === 0) {
            return NextResponse.json(
                { error: "Name and at least one reference image are required." },
                { status: 400 }
            );
        }

        const apiKey = await resolveOpenAIApiKey();
        if (!apiKey) {
            return NextResponse.json(
                { error: "OpenAI API Key not configured." },
                { status: 500 }
            );
        }

        // Fetch system prompts
        const settings = await db.select().from(appSettings).limit(1);
        const systemPrompts = {
            analysis: settings[0]?.spaceAnalysisPrompt,
        };

        const connector = new OpenAIConnector(apiKey, 'gpt-5-nano', systemPrompts);

        // Analyze the first image (or multiple if we wanted to be fancy, but let's start with one or parallelize)
        // For the wizard, we usually analyze them to get a collective idea, but the prompt expects us to return
        // objective, constraints, styleDefinition.
        // We can analyze all and then ask GPT to synthesize them into those 3 fields.

        // Let's analyze all references first.
        const refs = references as ReferenceImageInput[];
        const analyses = await Promise.all(
            refs.slice(0, 3).map(async (ref) => {
                return connector.analyzeReference(ref);
            })
        );

        // Now synthesize into the 3 fields
        // We can use a quick chat completion for this synthesis
        // We'll reuse the connector's client but we need a custom method or just expose the chat method?
        // Since `chat` is private, we can add a helper or just use a new prompt in `buildSpacePrompt` style.
        // Actually, let's just add a method to OpenAIConnector or do it here if we exposed the client.
        // Since we can't easily change the class interface right now without another file edit, 
        // let's assume we can use `buildSpacePrompt` or similar? No, that builds the final prompt.

        // Let's hack it slightly by using `analyzeReference` with a text-only "image" or just modify the class?
        // Better: Modify OpenAIConnector to have a `synthesizeAnalysis` method.
        // For now, to avoid context switching, I'll just use the `analyzeReference` method but pass a dummy image? No that's ugly.
        // I will update `lib/openai.ts` to include `synthesizeSpaceParams`.

        // Wait, I can't update `lib/openai.ts` in this tool call.
        // I will assume I will update it in the next step or I can just use `analyzeReference` if I change the prompt?
        // No, `analyzeReference` expects an image.

        // Let's look at `app/api/spaces/route.ts`. It uses `connector.buildSpacePrompt`.
        // Here in `analyze/route.ts`, we need to return `objective`, `constraints`, `styleDefinition`.
        // I should probably add `synthesizeSpaceParams` to `OpenAIConnector`.

        // For this step, I will write the code assuming `synthesizeSpaceParams` exists, 
        // and then I will update `lib/openai.ts` immediately after.

        const synthesis = await connector.synthesizeSpaceParams(name, analyses);

        return NextResponse.json(synthesis);

    } catch (error: unknown) {
        const err = error as Error;
        console.error("Error analyzing space:", err);
        return NextResponse.json(
            { error: err.message || "Failed to analyze space" },
            { status: 500 }
        );
    }
}
