import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { generateImageWithReplicateAction } from "../app/actions";
import logger from './logger';
import { RateLimiter } from "./rate-limiter";

export interface GenerationResult {
    prompt: string;
    imageUrl?: string; // Base64 data URI
    error?: string;
    isLoading?: boolean;
    variants?: { imageUrl: string, prompt: string }[];
    selectedVariantIndex?: number;
}

export class GenerationService {
    private client: GoogleGenAI;
    private replicateApiKey?: string;
    private modelName: string;
    private rateLimiter: RateLimiter;
    private temperature?: number;
    private topP?: number;
    private aspectRatio?: string;
    private width?: number;
    private height?: number;
    private provider: 'gemini' | 'replicate';
    private config?: any;

    constructor(apiKey: string, modelName: string, requestsPerMinute: number, temperature?: number, topP?: number, aspectRatio?: string, width?: number, height?: number, provider: 'gemini' | 'replicate' = 'gemini', replicateApiKey?: string, config?: any) {
        this.client = new GoogleGenAI({ apiKey });
        this.replicateApiKey = replicateApiKey;
        this.modelName = modelName;
        this.temperature = temperature;
        this.topP = topP;
        this.aspectRatio = aspectRatio;
        this.width = width;
        this.height = height;
        this.provider = provider;
        this.config = config;
        // Limit to requestsPerMinute per minute (60000 ms)
        this.rateLimiter = new RateLimiter(requestsPerMinute, 60000);
    }

    async generateImage(prompt: string, systemPrompt?: string): Promise<GenerationResult> {
        logger.info('Generating image request', { provider: this.provider, model: this.modelName, prompt, aspectRatio: this.aspectRatio });

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
                    if (this.aspectRatio === 'custom' && this.width && this.height) {
                        // For Gemini, we might need to format it as "W:H" if supported, or just pass it if the SDK supports it.
                        // Currently Gemini API mainly uses standard aspect ratios. 
                        // We'll try to pass it as aspect_ratio string "W:H" which might work for some models.
                        config.aspectRatio = `${this.width}:${this.height}`;
                    } else {
                        config.aspectRatio = this.aspectRatio;
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
                    logger.info('Gemini generation success', { prompt, imageGenerated: true });
                    return { prompt, imageUrl };
                } else {
                    logger.error('Gemini generation error', { error: "No image data received from Gemini.", prompt });
                    return { prompt, error: "No image data received from Gemini." };
                }

            } catch (error: any) {
                logger.error('Gemini generation exception', { error: error.message, prompt, attempt: attempt + 1 });
                console.error(`Generation Error (Attempt ${attempt + 1}/${maxRetries}):`, error);

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

        return { prompt, error: "Max retries exceeded for generation." };
    }

    private async generateWithReplicate(prompt: string): Promise<GenerationResult> {
        // We need the API key to be passed to the server action
        // Since we don't store it in the class anymore (as it was for the client), 
        // we might need to pass it or rely on the server action to pick it up if it's an env var.
        // However, the constructor still accepts replicateApiKey.
        // Let's store it in a private property if needed, or better, just use the one passed to constructor if we saved it.
        // Wait, I removed the property. I should keep the property but as a string, not a Replicate instance.

        // Actually, let's look at how I modified the constructor. I removed the initialization of this.replicate.
        // I should probably store the key.

        // For now, let's implement this method assuming I have access to the key. 
        // I will add the property back in a moment.

        if (!this.replicateApiKey) {
            logger.error('Replicate generation failed: Missing API Key');
            return { prompt, error: "Replicate API key not configured." };
        }

        try {
            await this.rateLimiter.acquire();

            // Create input object, excluding aspect_ratio from config if it's an array (options)
            // or if we have a specific aspectRatio set.
            const { aspect_ratio, ...restConfig } = this.config || {};

            const input: any = {
                prompt: prompt,
                ...restConfig,
            };

            // Apply selected aspect ratio
            if (this.aspectRatio) {
                if (this.aspectRatio === 'custom' && this.width && this.height) {
                    input.width = this.width;
                    input.height = this.height;
                    input.aspect_ratio = "custom"; // Flux might expect this explicitly or just omit it?
                    // The error said "Expected: string". 
                    // Some models like Flux might fail if aspect_ratio is present AND width/height are present if aspect_ratio is not "custom".
                    // But usually if width/height are there, aspect_ratio might be ignored or should be "custom".
                    // Let's set it to "custom" to be safe if the model supports it, or remove it if not.
                    // Replicate Flux documentation says: aspect_ratio: "1:1", "16:9", etc. OR custom.
                    // If custom, width and height are used.
                } else {
                    input.aspect_ratio = this.aspectRatio;
                    // Remove width/height if not custom, to avoid conflicts
                    delete input.width;
                    delete input.height;
                }
            } else if (aspect_ratio && !Array.isArray(aspect_ratio)) {
                // Fallback to config's aspect_ratio ONLY if it's a string (default value), not an array of options
                input.aspect_ratio = aspect_ratio;
            }

            // Ensure output format is set if not in config
            if (!input.output_format) {
                input.output_format = "jpg";
            }
            if (!input.output_quality) {
                input.output_quality = 80;
            }

            const result = await generateImageWithReplicateAction(this.replicateApiKey, this.modelName, input);

            if (result.error) {
                logger.error('Replicate generation error', { error: result.error, prompt });
                return { prompt, error: result.error };
            }

            if (result.imageUrl) {
                logger.info('Replicate generation success', { prompt, imageGenerated: true });
                return { prompt, imageUrl: result.imageUrl };
            } else {
                logger.error('Replicate generation failed: No URL', { prompt });
                return { prompt, error: "No image URL received from Replicate" };
            }

        } catch (error: any) {
            logger.error('Replicate generation exception', { error: error.message, prompt });
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
        logger.info('Enhancing prompt request', {
            userInput,
            model: textModelName,
            temperature,
            thinkingEnabled,
            searchEnabled
        });
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
                            text: `${userInput} \n\nIMPORTANT: RETURN ONLY THE FINAL PROMPT TEXT.DO NOT INCLUDE "Here is the prompt", "Option 1", OR ANY OTHER CONVERSATIONAL TEXT.JUST THE PROMPT.`
                        }
                    ]
                }
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

            const finalEnhancedPrompt = enhancedPrompt.trim();
            logger.info('Prompt enhancement success', { original: userInput, enhanced: finalEnhancedPrompt });
            return finalEnhancedPrompt;
        } catch (error: any) {
            logger.error('Prompt enhancement error', { error: error.message, userInput });
            console.error('Enhancement Error:', error);
            return userInput; // Return original on error
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
