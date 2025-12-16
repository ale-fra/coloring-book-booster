import { NextResponse } from "next/server";
import { createTextConnector } from "@/lib/connectors/factory";
import { getSystemConfig } from "@/lib/config";
import { DEFAULT_SPACE_PROMPT_GENERATION_PROMPT } from "@/lib/prompts";
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

        const connector = await createTextConnector();

        // Determine which system prompt template to use based on target model
        let systemPromptKey = 'space_system_prompt_gemini'; // Default
        if (targetModel === 'flux') {
            systemPromptKey = 'space_system_prompt_flux';
        }

        // Fetch the template
        const systemPromptTemplate = await getSystemConfig(systemPromptKey, DEFAULT_SPACE_PROMPT_GENERATION_PROMPT);

        // Construct the specific system instruction
        const systemPrompt = systemPromptTemplate
            .replace('{targetModel}', targetModel === 'flux' ? 'Flux (Black Forest Labs)' : 'Google Gemini / Imagen')
            .replace('{strategy}', targetModel === 'flux'
                ? '- Use a comma-separated list of highly specific visual tags.\n- Focus on technical keywords (e.g. "vector lines", "flat color", "f/8").\n- Avoid conversational language.'
                : '- Use natural, descriptive language.\n- Focus on the "feeling" and "composition" of the image.\n- Use complete sentences.')
            .replace('{name}', name)
            .replace('{objective}', objective)
            .replace('{constraints}', constraints || '')
            .replace('{styleDefinition}', styleDefinition || '');

        // Call the connector with the constructed system prompt
        const prompt = await connector.chat(systemPrompt, "Generate the System Prompt based on the instructions.");

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
