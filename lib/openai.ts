import OpenAI from 'openai';
import { logAIInteraction } from './ai-logger';
import { getSystemConfig } from './config';
import {
    DEFAULT_ANALYSIS_PROMPT,
    DEFAULT_GENERATION_PROMPT,
    DEFAULT_STANDARDIZATION_PROMPT,
    DEFAULT_SYNTHESIS_PROMPT
} from './prompts';

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
    constructor(
        apiKey: string,
        model: string = 'gpt-5-nano'
    ) {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    private async chat(messages: ChatMessage[], temperature = 0.3): Promise<string> {
        const startTime = Date.now();
        let responseContent = '';
        let status: 'success' | 'error' = 'success';
        let errorMsg = '';

        try {
            const requestBody: OpenAI.Chat.ChatCompletionCreateParams = {
                model: this.model,
                messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            };

            // O1 models and gpt-5-nano (if it behaves like o1) do not support temperature
            // or only support default (1).
            // We'll exclude temperature for these specific models or if it is 1.
            const isO1 = this.model.startsWith('o1-') || this.model === 'gpt-5-nano';
            if (!isO1) {
                requestBody.temperature = temperature;
            } else if (temperature !== 1) {
                // If it is O1/gpt-5-nano and temp is NOT 1, we log a warning but don't send it
                // to avoid the 400 error.
                console.warn(`Warning: Temperature ${temperature} is not supported for model ${this.model}. Using default.`);
            }

            const response = await this.client.chat.completions.create(requestBody);

            responseContent = response.choices[0]?.message?.content?.trim() || '';
            return responseContent;
        } catch (error: unknown) {
            status = 'error';
            const err = error as Error;
            errorMsg = err.message;
            console.error('OpenAI API Error:', err);
            throw new Error(`OpenAI error: ${err.message}`);
        } finally {
            const duration = Date.now() - startTime;
            // Fire and forget logging
            logAIInteraction(
                'openai',
                this.model,
                messages,
                status === 'success' ? responseContent : errorMsg,
                status,
                duration
            );
        }
    }

    async analyzeReference(reference: ReferenceImageInput): Promise<string> {
        const analysisPrompt = await getSystemConfig('space_analysis_prompt', DEFAULT_ANALYSIS_PROMPT);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: analysisPrompt,
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

        const generationPrompt = await getSystemConfig('space_generation_prompt', DEFAULT_GENERATION_PROMPT);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: generationPrompt,
            },
            {
                role: 'user',
                content: guidance,
            },
        ];

        return this.chat(messages, 0.25);
    }

    async standardizeRequest(spacePrompt: string, userRequest: string): Promise<string> {
        const standardizationPrompt = await getSystemConfig('space_standardization_prompt', DEFAULT_STANDARDIZATION_PROMPT);

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: standardizationPrompt,
            },
            {
                role: 'user',
                content: `SPACE PROMPT:\n${spacePrompt}\n\nUSER REQUEST:\n${userRequest}\n\nReturn only the final standardized prompt.`,
            },
        ];

        return this.chat(messages, 0.3);
    }

    async synthesizeSpaceParams(name: string, analyses: string[]): Promise<{ objective: string; constraints: string; styleDefinition: string }> {
        const synthesisPromptTemplate = await getSystemConfig('space_synthesis_prompt', DEFAULT_SYNTHESIS_PROMPT);

        // Simple template replacement
        const prompt = synthesisPromptTemplate
            .replace('{name}', name)
            .replace('{analyses}', analyses.map((a, i) => `${i + 1}. ${a}`).join('\n'));

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
