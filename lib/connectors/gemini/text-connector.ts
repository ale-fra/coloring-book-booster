import { GoogleGenAI } from "@google/genai";
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

export class GeminiTextConnector implements ITextConnector {
    protected client: GoogleGenAI;
    protected model: string;

    constructor(apiKey: string, model: string = 'gemini-2.0-flash-exp') {
        this.client = new GoogleGenAI({ apiKey });
        this.model = model;
    }

    async chat(systemPrompt: string, userMessage: string): Promise<string> {
        // Prepare contents for Gemini
        // Gemini handles system instructions in config, separate from chat history
        const contents = [
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

        return this.internalGenerate(contents, systemPrompt);
    }

    protected async internalGenerate(contents: any[], systemInstruction?: string, temperature = 0.3): Promise<string> {
        const startTime = Date.now();
        let responseContent = '';
        let status: 'success' | 'error' = 'success';
        let errorMsg = '';

        try {
            const config: any = {
                temperature,
            };

            if (systemInstruction) {
                config.systemInstruction = [{ text: systemInstruction }];
            }

            const response = await this.client.models.generateContent({
                model: this.model,
                config,
                contents,
            });

            responseContent = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return responseContent;
        } catch (error: unknown) {
            status = 'error';
            const err = error as Error;
            errorMsg = err.message;
            console.error('Gemini API Error:', err);
            throw new Error(`Gemini error: ${err.message}`);
        } finally {
            const duration = Date.now() - startTime;
            logAIInteraction(
                'gemini',
                this.model,
                { contents, systemInstruction },
                status === 'success' ? responseContent : errorMsg,
                status,
                duration
            );
        }
    }

    async synthesizeSpaceParams(name: string, analyses: string[]): Promise<SynthesisResult> {
        const synthesisPromptTemplate = await getSystemConfig('space_synthesis_prompt', DEFAULT_SYNTHESIS_PROMPT);

        let prompt = synthesisPromptTemplate.replace('{name}', name);

        // If the template expects analyses via placeholder, replace it.
        // Otherwise, append them to the end.
        const analysesText = analyses.map((a, i) => `${i + 1}. ${a}`).join('\n');

        if (prompt.includes('{analyses}')) {
            prompt = prompt.replace('{analyses}', analysesText);
        } else {
            prompt += `\n\nREFERENCE ANALYSES:\n${analysesText}`;
        }

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
        return this.internalGenerate([
            { role: 'user', parts: [{ text: guidance }] }
        ], generationPrompt, 0.4);
    }

    async standardizeRequest(spacePrompt: string, userRequest: string): Promise<string> {
        let standardizationPrompt = await getSystemConfig('space_standardization_prompt', DEFAULT_STANDARDIZATION_PROMPT);

        // Perform replacement
        standardizationPrompt = standardizationPrompt
            .replace('{spacePrompt}', spacePrompt)
            .replace('{userPrompt}', userRequest);

        // Send the fully formulated prompt as the user message (or system + user if we split it, 
        // but the template combines them, so sending as single message is safest).
        return this.internalGenerate([
            { role: 'user', parts: [{ text: standardizationPrompt }] }
        ], undefined, 0.3);
    }
}
