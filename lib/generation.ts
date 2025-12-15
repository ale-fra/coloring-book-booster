import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { generateImageWithReplicateAction } from "../app/actions";
import logger from './logger';
import { logAIInteraction } from './ai-logger';
import { GenerationResult } from './generation-types';
import { RateLimiter } from "./rate-limiter";
import { getSystemConfig } from './config';
import { DEFAULT_SPACE_PROMPT_GENERATION_PROMPT } from './prompts';

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

        const startTime = Date.now();
        let status: 'success' | 'error' = 'success';
        let output: any = {};
        let finalError = '';

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
                    config: config as any,
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
                    logger.info('Gemini generation success', { prompt, imageGenerated: true });
                    output = { imageUrl: '...base64 data...' };
                    logAIInteraction('gemini', this.modelName, { prompt, config }, output, 'success', Date.now() - startTime);
                    return { prompt, imageUrl };
                } else {
                    logger.error('Gemini generation error', { error: "No image data received from Gemini.", prompt });
                    finalError = "No image data received from Gemini.";
                }

            } catch (error: any) {
                logger.error('Gemini generation exception', { error: error.message, prompt, attempt: attempt + 1 });
                console.error(`Generation Error (Attempt ${attempt + 1}/${maxRetries}):`, error);
                finalError = error.message;

                const errorMessage = error.message || "";
                if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
                    attempt++;
                    if (attempt < maxRetries) {
                        console.log("Resource exhausted. Waiting 60 seconds before retrying...");
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        continue;
                    }
                }
            }
            attempt++;
        }

        logAIInteraction('gemini', this.modelName, { prompt }, { error: finalError }, 'error', Date.now() - startTime);
        return { prompt, error: finalError || "Max retries exceeded for generation." };
    }

    async generateWithReplicate(prompt: string): Promise<GenerationResult> {
        const startTime = Date.now();
        let status: 'success' | 'error' = 'success';
        let output: any = {};

        try {
            if (!this.replicateApiKey) {
                status = 'error';
                output = { error: "Replicate API key not configured." };
                logger.error('Replicate generation failed: Missing API Key');
                return { prompt, error: "Replicate API key not configured." };
            }

            await this.rateLimiter.acquire();

            const { aspect_ratio, ...restConfig } = this.config || {};

            const input: any = {
                prompt: prompt,
                ...restConfig,
            };

            if (this.aspectRatio) {
                if (this.aspectRatio === 'custom' && this.width && this.height) {
                    input.width = this.width;
                    input.height = this.height;
                    input.aspect_ratio = "custom";
                } else {
                    input.aspect_ratio = this.aspectRatio;
                    delete input.width;
                    delete input.height;
                }
            } else if (aspect_ratio && !Array.isArray(aspect_ratio)) {
                input.aspect_ratio = aspect_ratio;
            }

            if (!input.output_format) {
                input.output_format = "jpg";
            }
            if (!input.output_quality) {
                input.output_quality = 80;
            }

            const result = await generateImageWithReplicateAction(this.replicateApiKey, this.modelName, input);
            output = result;

            if (result.error) {
                status = 'error';
                logger.error('Replicate generation error', { error: result.error, prompt });
                return { prompt, error: result.error };
            }

            if (result.imageUrl) {
                logger.info('Replicate generation success', { prompt, imageGenerated: true });
                return { prompt, imageUrl: result.imageUrl };
            } else {
                status = 'error';
                output = { error: "No image URL received from Replicate" };
                logger.error('Replicate generation failed: No URL', { prompt });
                return { prompt, error: "No image URL received from Replicate" };
            }

        } catch (error: any) {
            status = 'error';
            output = { error: error.message };
            logger.error('Replicate generation exception', { error: error.message, prompt });
            console.error("Replicate Generation Error:", error);
            return { prompt, error: error.message || "Unknown Replicate error" };
        } finally {
            const duration = Date.now() - startTime;
            logAIInteraction(
                'replicate',
                this.modelName,
                { prompt, config: this.config },
                output,
                status,
                duration
            );
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
        const startTime = Date.now();
        let status: 'success' | 'error' = 'success';
        let output = '';

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
            output = finalEnhancedPrompt;
            logger.info('Prompt enhancement success', { original: userInput, enhanced: finalEnhancedPrompt });
            return finalEnhancedPrompt;
        } catch (error: any) {
            status = 'error';
            output = error.message;
            logger.error('Prompt enhancement error', { error: error.message, userInput });
            console.error('Enhancement Error:', error);
            return userInput; // Return original on error
        } finally {
            const duration = Date.now() - startTime;
            logAIInteraction(
                'gemini-text',
                textModelName,
                { userInput, systemPrompt },
                output,
                status,
                duration
            );
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

    async generateSpacePrompt(
        params: {
            name: string;
            objective: string;
            constraints: string;
            styleDefinition: string;
            targetModel: 'gemini' | 'flux';
        },
        textModelName: string
    ): Promise<string> {
        const startTime = Date.now();
        let status: 'success' | 'error' = 'success';
        let output = '';

        try {
            const systemPromptTemplate = await getSystemConfig('space_prompt_generation_prompt', DEFAULT_SPACE_PROMPT_GENERATION_PROMPT);

            const systemPrompt = systemPromptTemplate
                .replace('{targetModel}', params.targetModel === 'flux' ? 'Flux (Black Forest Labs)' : 'Google Gemini / Imagen')
                .replace('{strategy}', params.targetModel === 'flux'
                    ? '- Use a comma-separated list of highly specific visual tags.\n- Focus on technical keywords (e.g. "vector lines", "flat color", "f/8").\n- Avoid conversational language.'
                    : '- Use natural, descriptive language.\n- Focus on the "feeling" and "composition" of the image.\n- Use complete sentences.')
                .replace('{name}', params.name)
                .replace('{objective}', params.objective)
                .replace('{constraints}', params.constraints)
                .replace('{styleDefinition}', params.styleDefinition);

            const config: any = {
                temperature: 0.4,
            };

            const contents = [
                {
                    role: 'user',
                    parts: [{ text: "Generate the System Prompt based on the instructions." }]
                }
            ];

            // We need to use a text model for this, so we assume 'this.modelName' is a text model 
            // OR we need to pass the text model name. The caller should ensure 'this.modelName' is correct 
            // or we should instantiate a new client with the text model.
            // Since GenerationService is usually instantiated with an image model for image generation,
            // we should probably allow passing the model name or use the one passed in arguments.

            // Actually, the caller of this method should instantiate GenerationService with the TEXT model.

            const response = await this.client.models.generateContentStream({
                model: textModelName,
                config: config as any,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: systemPrompt }]
                    }
                ],
            });

            let generatedPrompt = '';
            for await (const chunk of response) {
                if (chunk.text) {
                    generatedPrompt += chunk.text;
                }
            }

            output = generatedPrompt.trim();
            return output;

        } catch (error: any) {
            status = 'error';
            output = error.message;
            console.error('Space Prompt Generation Error:', error);
            throw error;
        } finally {
            const duration = Date.now() - startTime;
            logAIInteraction(
                'gemini-text',
                textModelName,
                { task: 'generateSpacePrompt', params },
                output,
                status,
                duration
            );
        }
    }
}
