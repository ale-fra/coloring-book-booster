interface ChatMessage {
    role: 'system' | 'user';
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
    private apiKey: string;
    private model: string;
    private systemPrompts: {
        analysis?: string | null;
        generation?: string | null;
        standardization?: string | null;
    };

    constructor(
        apiKey: string,
        model: string = 'gpt-4o-mini',
        systemPrompts: { analysis?: string | null; generation?: string | null; standardization?: string | null } = {}
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.systemPrompts = systemPrompts;
    }

    private async chat(messages: ChatMessage[], temperature = 0.3): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                temperature,
                messages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const content = choice?.message?.content;

        if (Array.isArray(content)) {
            return content.map((part: { text?: string }) => part?.text || '').join(' ').trim();
        }

        return (content as string | undefined)?.trim() || '';
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
}
