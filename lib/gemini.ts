import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import Replicate from "replicate";
import { RateLimiter } from "./rate-limiter";

export interface GenerationResult {
    prompt: string;
    imageUrl?: string; // Base64 data URI
    error?: string;
    isLoading?: boolean;
    variants?: { imageUrl: string, prompt: string }[];
    selectedVariantIndex?: number;
}

export class GeminiService {
    private client: GoogleGenAI;
    private replicate?: Replicate;
    private modelName: string;
    private rateLimiter: RateLimiter;
    private temperature?: number;
    private topP?: number;
    private aspectRatio?: string;
    private provider: 'gemini' | 'replicate';
    private config?: any;

    constructor(apiKey: string, modelName: string, requestsPerMinute: number, temperature?: number, topP?: number, aspectRatio?: string, provider: 'gemini' | 'replicate' = 'gemini', replicateApiKey?: string, config?: any) {
        this.client = new GoogleGenAI({ apiKey });
        if (replicateApiKey) {
            this.replicate = new Replicate({ auth: replicateApiKey });
        }
        this.modelName = modelName;
        this.temperature = temperature;
        this.topP = topP;
        this.aspectRatio = aspectRatio;
        this.provider = provider;
        this.config = config;
        // Limit to requestsPerMinute per minute (60000 ms)
        this.rateLimiter = new RateLimiter(requestsPerMinute, 60000);
    }

    async generateImage(prompt: string, systemPrompt?: string): Promise<GenerationResult> {
        if (this.provider === 'replicate') {
            return this.generateWithReplicate(prompt);
        }

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const config: any = {
                    responseModalities: ["IMAGE", "TEXT"],
                    systemInstruction: systemPrompt ? [{ text: systemPrompt }] : undefined,
                    temperature: this.temperature,
                    topP: this.topP,
                };

                if (this.aspectRatio) {
                    config.aspectRatio = this.aspectRatio;
                }

                const contents = [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ];

                await this.rateLimiter.acquire();

                const response = await this.client.models.generateContentStream({
                    model: this.modelName,
                    config: config as any, // Type definition might be slightly off in beta
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
                        break; // Assuming one image per request for now
                    }
                }

                if (imageUrl) {
                    return { prompt, imageUrl };
                } else {
                    return { prompt, error: "No image data received from Gemini." };
                }

            } catch (error: any) {
                console.error(`Gemini Generation Error (Attempt ${attempt + 1}/${maxRetries}):`, error);

                const errorMessage = error.message || "";
                if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
                    attempt++;
                    if (attempt < maxRetries) {
                        console.log("Resource exhausted. Waiting 60 seconds before retrying...");
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        continue;
                    }
                }

                return { prompt, error: error.message || "Unknown error" };
            }
        }

        return { prompt, error: "Max retries exceeded for Gemini generation." };
    }

    private async generateWithReplicate(prompt: string): Promise<GenerationResult> {
        if (!this.replicate) {
            return { prompt, error: "Replicate API key not configured." };
        }

        try {
            await this.rateLimiter.acquire();

            const input = {
                prompt: prompt,
                ...this.config, // Merge custom config
            };

            // If config doesn't have aspect_ratio, use the global one
            if (!input.aspect_ratio && this.aspectRatio) {
                input.aspect_ratio = this.aspectRatio === '1:1' ? '1:1' : (this.aspectRatio === '4:5' ? '4:5' : (this.aspectRatio === '5:4' ? '5:4' : 'custom'));
            }

            // Ensure output format is set if not in config
            if (!input.output_format) {
                input.output_format = "jpg";
            }
            if (!input.output_quality) {
                input.output_quality = 80;
            }

            const output = await this.replicate.run(this.modelName as any, { input });

            let imageUrl: string | undefined;

            if (Array.isArray(output)) {
                // It's likely an array of URLs
                const firstItem = output[0];
                if (typeof firstItem === 'string') {
                    imageUrl = firstItem;
                } else if (firstItem && typeof firstItem === 'object' && 'url' in firstItem) {
                    // Maybe a file object
                    imageUrl = (firstItem as any).url().toString();
                }
            } else if (typeof output === 'string') {
                imageUrl = output;
            } else if (output && typeof output === 'object' && 'url' in output) {
                imageUrl = (output as any).url().toString();
            } else {
                // Fallback for stream or unknown
                console.log("Unknown Replicate output format:", output);
                return { prompt, error: "Unknown output format from Replicate" };
            }

            if (imageUrl) {
                const imageResponse = await fetch(imageUrl);
                const arrayBuffer = await imageResponse.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
                const dataUri = `data:${mimeType};base64,${base64}`;

                return { prompt, imageUrl: dataUri };
            } else {
                return { prompt, error: "No image URL received from Replicate" };
            }

        } catch (error: any) {
            console.error("Replicate Generation Error:", error);
            return { prompt, error: error.message || "Unknown Replicate error" };
        }
    }

    async enhancePrompt(
        userInput: string,
        textModelName: string,
        systemPrompt: string,
        temperature: number = 0.3,
        thinkingEnabled: boolean = false,
        searchEnabled: boolean = false
    ): Promise<string> {
        try {
            const config: any = {
                temperature: temperature,
                mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
                systemInstruction: [
                    {
                        text: systemPrompt,
                    }
                ],
            };

            // Only add thinkingConfig if thinking is enabled
            if (thinkingEnabled) {
                config.thinkingConfig = {
                    thinkingBudget: 10000, // Budget when enabled
                };
            } else {
                config.thinkingConfig = {
                    thinkingBudget: 0, // Disabled
                };
            }

            // Add search grounding if enabled
            if (searchEnabled) {
                config.tools = [{
                    googleSearch: {}
                }];
            }

            const contents = [
                {
                    role: 'user',
                    parts: [
                        {
                            text: userInput,
                        },
                    ],
                },
            ];

            const response = await this.client.models.generateContentStream({
                model: textModelName,
                config: config as any,
                contents,
            });

            let enhancedPrompt = '';
            for await (const chunk of response) {
                if (chunk.text) {
                    enhancedPrompt += chunk.text;
                }
            }

            return enhancedPrompt.trim();
        } catch (error: any) {
            console.error('Prompt enhancement error:', error);
            throw new Error(`Failed to enhance prompt: ${error.message || 'Unknown error'}`);
        }
    }

    async generateBatch(prompts: string[], systemPrompt?: string, batchSize: number = 10): Promise<GenerationResult[]> {
        // Note: The UI currently handles batching to show progress, 
        // but this method is kept for completeness or future use.
        const results: GenerationResult[] = [];

        for (let i = 0; i < prompts.length; i += batchSize) {
            const batch = prompts.slice(i, i + batchSize);
            const batchPromises = batch.map(prompt => this.generateImage(prompt, systemPrompt));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        return results;
    }
}
