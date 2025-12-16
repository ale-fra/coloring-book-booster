import { GoogleGenAI } from "@google/genai";
import { IImageGenerator } from '../interfaces';
import { GenerationResult } from '../../generation-types';
import { RateLimiter } from '../../rate-limiter';
import logger from '../../logger';
import { logAIInteraction } from '../../ai-logger';

export interface GeminiImageGeneratorConfig {
    apiKey: string;
    model: string;
    requestsPerMinute: number;
    aspectRatio?: string;
    width?: number;
    height?: number;
    temperature?: number;
    topP?: number;
}

export class GeminiImageGenerator implements IImageGenerator {
    private client: GoogleGenAI;
    private config: GeminiImageGeneratorConfig;
    private rateLimiter: RateLimiter;

    constructor(config: GeminiImageGeneratorConfig) {
        this.client = new GoogleGenAI({ apiKey: config.apiKey });
        this.config = config;
        this.rateLimiter = new RateLimiter(config.requestsPerMinute, 60000);
    }

    async generateImage(prompt: string, systemPrompt?: string): Promise<GenerationResult> {
        const startTime = Date.now();
        let finalError = '';
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const genConfig: any = {
                    responseModalities: ["IMAGE", "TEXT"],
                    systemInstruction: systemPrompt ? [{ text: systemPrompt }] : undefined,
                    temperature: this.config.temperature,
                    topP: this.config.topP,
                };

                if (this.config.aspectRatio) {
                    if (this.config.aspectRatio === 'custom' && this.config.width && this.config.height) {
                        genConfig.aspectRatio = `${this.config.width}:${this.config.height}`;
                    } else {
                        genConfig.aspectRatio = this.config.aspectRatio;
                    }
                }

                const contents = [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ];

                await this.rateLimiter.acquire();

                const response = await this.client.models.generateContentStream({
                    model: this.config.model,
                    config: genConfig,
                    contents,
                });

                let imageUrl: string | undefined;

                for await (const chunk of response) {
                    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
                        continue;
                    }

                    const part = chunk.candidates[0].content.parts[0];

                    if (part.inlineData) {
                        const mimeType = part.inlineData.mimeType || "image/png";
                        const data = part.inlineData.data;
                        imageUrl = `data:${mimeType};base64,${data}`;
                        break;
                    }
                }

                if (imageUrl) {
                    logAIInteraction('gemini', this.config.model, { prompt, config: genConfig }, { imageUrl: '...base64...' }, 'success', Date.now() - startTime);
                    return { prompt, imageUrl };
                } else {
                    finalError = "No image data received from Gemini.";
                }

            } catch (error: any) {
                console.error(`Generation Error (Attempt ${attempt + 1}/${maxRetries}):`, error);
                finalError = error.message;

                const errorMessage = error.message || "";
                if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
                    attempt++;
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        continue;
                    }
                }
            }
            attempt++;
        }

        logAIInteraction('gemini', this.config.model, { prompt }, { error: finalError }, 'error', Date.now() - startTime);
        return { prompt, error: finalError || "Max retries exceeded for generation." };
    }
}
