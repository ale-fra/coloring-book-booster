import { NextResponse } from "next/server";
import { GenerationService } from "@/lib/generation";
import { getApiKey, getModels } from "@/app/actions";
import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, objective, constraints, styleDefinition, targetModel } = body;

        if (!name || !objective || !targetModel) {
            return NextResponse.json(
                { error: "Missing required fields: name, objective, targetModel" },
                { status: 400 }
            );
        }

        const apiKey = await getApiKey();
        if (!apiKey) {
            return NextResponse.json(
                { error: "Gemini API Key not configured." },
                { status: 500 }
            );
        }

        // Find a suitable text model
        const models = await getModels();
        const textModel = models.find(m => m.type === 'text' && m.provider === 'gemini');

        if (!textModel) {
            return NextResponse.json(
                { error: "No Gemini text model configured." },
                { status: 500 }
            );
        }

        // Instantiate GenerationService with the text model
        // We pass dummy values for image-specific params since we are only doing text generation
        const service = new GenerationService(
            apiKey,
            textModel.name,
            textModel.tpm || 60,
            textModel.temperature,
            textModel.topP
        );

        const prompt = await service.generateSpacePrompt(
            { name, objective, constraints, styleDefinition, targetModel },
            textModel.name
        );

        return NextResponse.json({ prompt });

    } catch (error: unknown) {
        const err = error as Error;
        console.error("Error generating space prompt:", err);
        return NextResponse.json(
            { error: err.message || "Failed to generate prompt" },
            { status: 500 }
        );
    }
}
