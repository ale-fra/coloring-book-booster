import { IImageGenerator } from '../interfaces';
import { GenerationResult } from '../../generation-types';
import { RateLimiter } from '../../rate-limiter';
import logger from '../../logger';
import { logAIInteraction } from '../../ai-logger';
import { generateImageWithReplicateAction } from '../../../app/actions';

export interface ReplicateImageGeneratorConfig {
    apiKey: string;
    model: string;
    requestsPerMinute: number;
    aspectRatio?: string;
    width?: number;
    height?: number;
    extraConfig?: any;
}

export class ReplicateImageGenerator implements IImageGenerator {
    private config: ReplicateImageGeneratorConfig;
    private rateLimiter: RateLimiter;

    constructor(config: ReplicateImageGeneratorConfig) {
        this.config = config;
        this.rateLimiter = new RateLimiter(config.requestsPerMinute, 60000);
    }

    async generateImage(prompt: string, systemPrompt?: string): Promise<GenerationResult> {
        const startTime = Date.now();
        let status: 'success' | 'error' = 'success';
        let output: any = {};

        try {
            await this.rateLimiter.acquire();

            const { aspect_ratio, ...restConfig } = this.config.extraConfig || {};

            // Allow override of aspect ratio from top-level config
            const aspectRatio = this.config.aspectRatio || aspect_ratio;

            const input: any = {
                prompt: prompt,
                ...restConfig,
            };

            // Replicate specific handling for aspect ratio / width / height
            if (this.config.aspectRatio) {
                if (this.config.aspectRatio === 'custom' && this.config.width && this.config.height) {
                    input.width = this.config.width;
                    input.height = this.config.height;
                    input.aspect_ratio = "custom";
                } else if (this.config.aspectRatio !== 'custom') {
                    input.aspect_ratio = this.config.aspectRatio;
                    // Usually we don't send width/height if aspect_ratio is set, unless custom
                    delete input.width;
                    delete input.height;
                }
            } else if (aspectRatio && !Array.isArray(aspectRatio)) {
                input.aspect_ratio = aspectRatio;
            }

            // Defaults
            if (!input.output_format) input.output_format = "jpg";
            if (!input.output_quality) input.output_quality = 80;
            // Note: Replicate doesn't typically take a separate "systemPrompt" arg in the input object 
            // the same way Gemini does, it's model dependent. 
            // If the model supports system_prompt, we can add it.
            if (systemPrompt) {
                input.system_prompt = systemPrompt;
            }

            const result = await generateImageWithReplicateAction(this.config.apiKey, this.config.model, input);
            output = result;

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.imageUrl) {
                return { prompt, imageUrl: result.imageUrl };
            } else {
                throw new Error("No image URL received from Replicate");
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
                this.config.model,
                { prompt, config: this.config },
                output,
                status,
                duration
            );
        }
    }
}
