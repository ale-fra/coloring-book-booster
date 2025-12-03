import OpenAI from 'openai';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface ReferenceImageInput {
    dataUrl: string;
    name?: string;
    mimeType?: string;
}

export interface SpacePromptRequest {
    name: string;
    objective: string;
    theme?: string;
    constraints?: string;
    styleDefinition?: string;
    imageAnalyses: string[];
}

export class OpenAIConnector {
    private client: OpenAI;
    private model: string;
    private systemPrompts: {
        analysis?: string | null;
        generation?: string | null;
        standardization?: string | null;
    };

    constructor(
        apiKey: string,
        model: string = 'gpt-5-nano',
        systemPrompts: { analysis?: string | null; generation?: string | null; standardization?: string | null } = {}
    ) {
        this.client = new OpenAI({ apiKey });
        this.model = model;
        this.systemPrompts = systemPrompts;
    }

    private async chat(messages: ChatMessage[], temperature = 0.3): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
                temperature,
            });

            return response.choices[0]?.message?.content?.trim() || '';
        } catch (error: unknown) {
            const err = error as Error;
            console.error('OpenAI API Error:', err);
            throw new Error(`OpenAI error: ${err.message}`);
        }
    }

    async analyzeReference(reference: ReferenceImageInput): Promise<string> {
        const defaultPrompt =
            'Analyze this reference image and provide 3-5 concise bullet points covering: line style, color palette (or lack thereof), complexity, composition, and recurring elements to maintain or avoid.';

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: this.systemPrompts.analysis || defaultPrompt,
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Reference to analyze and synthesize for the Space.' },
                    { type: 'image_url', image_url: { url: reference.dataUrl } },
                ],
            },
        ];

        return this.chat(messages, 0.2);
    }

    async buildSpacePrompt(request: SpacePromptRequest): Promise<string> {
        const { name, objective, constraints, theme, styleDefinition, imageAnalyses } = request;
        const guidance = [
            `Space: ${name}`,
            `Objective: ${objective}`,
            theme ? `Recurring Theme: ${theme}` : null,
            constraints ? `Constraints: ${constraints}` : null,
            styleDefinition ? `User Style Definition: ${styleDefinition}` : null,
            imageAnalyses.length > 0
                ? `Reference Image Analyses: ${imageAnalyses.map((item, idx) => `(${idx + 1}) ${item}`).join(' ')}`
                : null,
        ]
            .filter(Boolean)
            .join('\n');

        const defaultPrompt =
            'You are a prompt engineer. You receive descriptions and reference analyses to build a unique, concise, and complete Space Prompt. The prompt must be reusable, describing tone, composition, lines, allowed complexity, elements to avoid, palette, and output format. Return only the final prompt text.';

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: this.systemPrompts.generation || defaultPrompt,
            },
            {
                role: 'user',
                content: guidance,
            },
        ];

        return this.chat(messages, 0.25);
    }

    async standardizeRequest(spacePrompt: string, userRequest: string): Promise<string> {
        const defaultPrompt =
            'Take the following Space Prompt as a fixed style rule. Receive a user request and transform it into a standardized, clean, and consistent prompt that faithfully respects the Space. Include necessary corrections and adjustments to maintain composition, detail level, and established prohibitions.';

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: this.systemPrompts.standardization || defaultPrompt,
            },
            {
                role: 'user',
                content: `SPACE PROMPT:\n${spacePrompt}\n\nUSER REQUEST:\n${userRequest}\n\nReturn only the final standardized prompt.`,
            },
        ];

        return this.chat(messages, 0.3);
    }

    async synthesizeSpaceParams(name: string, analyses: string[]): Promise<{ objective: string; constraints: string; styleDefinition: string }> {
        const prompt = `
            Based on the following image analyses for a style named "${name}", synthesize the core parameters for a generative AI model.
            
            Analyses:
            ${analyses.map((a, i) => `${i + 1}. ${a}`).join('\n')}
            
            Return a JSON object with exactly these keys:
            - objective: A clear, positive description of what the style achieves (visual characteristics, mood).
            - constraints: What should be avoided to maintain this style (negative constraints).
            - styleDefinition: A concise, high-level definition of the style (e.g. "Vintage Comic Book", "Minimalist Line Art").
            
            Do not include markdown formatting, just the raw JSON string.
        `;

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: 'You are an expert art director and prompt engineer. Output valid JSON only.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ];

        const response = await this.chat(messages, 0.2);
        try {
            // clean markdown code blocks if present
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("Failed to parse synthesis JSON", response, error);
            return {
                objective: "Failed to synthesize objective.",
                constraints: "Failed to synthesize constraints.",
                styleDefinition: "Failed to synthesize style definition."
            };
        }
    }
}
