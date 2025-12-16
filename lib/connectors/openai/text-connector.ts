import OpenAI from 'openai';
import { ITextConnector, SpacePromptRequest, SynthesisResult } from '../interfaces';
import { logAIInteraction } from '../../ai-logger';
import { getSystemConfig } from '../../config';
import {
    DEFAULT_GENERATION_PROMPT,
    DEFAULT_STANDARDIZATION_PROMPT,
    DEFAULT_SYNTHESIS_PROMPT
} from '../../prompts';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export class OpenAITextConnector implements ITextConnector {
    protected client: OpenAI;
    protected model: string;

    constructor(apiKey: string, model: string = 'gpt-5-nano') {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async chat(systemPrompt: string, userMessage: string): Promise<string> {
        return this.internalChat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ]);
    }

    protected async internalChat(messages: ChatMessage[], temperature = 0.3): Promise<string> {
        const startTime = Date.now();
        let responseContent = '';
        let status: 'success' | 'error' = 'success';
        let errorMsg = '';

        try {
            const requestBody: OpenAI.Chat.ChatCompletionCreateParams = {
                model: this.model,
                messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            };

            const isO1 = this.model.startsWith('o1-') || this.model === 'gpt-5-nano';
            if (!isO1) {
                requestBody.temperature = temperature;
            } else if (temperature !== 1) {
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

    async synthesizeSpaceParams(name: string, analyses: string[]): Promise<SynthesisResult> {
        const synthesisPromptTemplate = await getSystemConfig('space_synthesis_prompt', DEFAULT_SYNTHESIS_PROMPT);

        const prompt = synthesisPromptTemplate
            .replace('{name}', name)
            .replace('{analyses}', analyses.map((a, i) => `${i + 1}. ${a}`).join('\n'));

        const response = await this.chat('You are an expert art director and prompt engineer. Output valid JSON only.', prompt);

        try {
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
        return this.internalChat([
            { role: 'system', content: generationPrompt },
            { role: 'user', content: guidance }
        ], 0.25);
    }

    async standardizeRequest(spacePrompt: string, userRequest: string): Promise<string> {
        const standardizationPrompt = await getSystemConfig('space_standardization_prompt', DEFAULT_STANDARDIZATION_PROMPT);

        const content = `SPACE PROMPT:\n${spacePrompt}\n\nUSER REQUEST:\n${userRequest}\n\nReturn only the final standardized prompt.`;

        return this.internalChat([
            { role: 'system', content: standardizationPrompt },
            { role: 'user', content }
        ], 0.3);
    }
}
