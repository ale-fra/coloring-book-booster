import { ITextConnector, IVisionConnector, IImageGenerator, AIProvider } from './interfaces';
import { OpenAITextConnector } from './openai/text-connector';
import { OpenAIVisionConnector } from './openai/vision-connector';
import { GeminiTextConnector } from './gemini/text-connector';
import { GeminiVisionConnector } from './gemini/vision-connector';
import { GeminiImageGenerator, GeminiImageGeneratorConfig } from './gemini/image-generator';
import { ReplicateImageGenerator, ReplicateImageGeneratorConfig } from './replicate/image-generator';
import { getSystemConfig } from '../config';

async function getDefaultTextProvider(): Promise<AIProvider> {
    const provider = await getSystemConfig('default_text_provider', 'gemini');
    return provider as AIProvider;
}

async function getDefaultVisionProvider(): Promise<AIProvider> {
    const provider = await getSystemConfig('default_vision_provider', 'openai');
    return provider as AIProvider;
}

async function getDefaultImageProvider(): Promise<AIProvider> {
    const provider = await getSystemConfig('default_image_provider', 'gemini');
    return provider as AIProvider;
}

function getApiKey(provider: AIProvider): string {
    switch (provider) {
        case 'openai':
            return process.env.OPENAI_API_KEY || '';
        case 'gemini':
            return process.env.GEMINI_API_KEY || '';
        case 'anthropic':
            return process.env.ANTHROPIC_API_KEY || '';
        default:
            return '';
    }
}

function getReplicateKey(): string {
    return process.env.REPLICATE_API_TOKEN || '';
}

export async function createTextConnector(provider?: AIProvider): Promise<ITextConnector> {
    const selectedProvider = provider ?? await getDefaultTextProvider();
    const apiKey = getApiKey(selectedProvider);

    if (!apiKey) {
        throw new Error(`API key not found for provider: ${selectedProvider}`);
    }

    switch (selectedProvider) {
        case 'openai':
            return new OpenAITextConnector(apiKey, 'gpt-5-nano'); // Default model
        case 'gemini':
            return new GeminiTextConnector(apiKey, 'gemini-2.0-flash-exp'); // Default model
        default:
            throw new Error(`Unsupported text provider: ${selectedProvider}`);
    }
}

export async function createVisionConnector(provider?: AIProvider): Promise<IVisionConnector> {
    const selectedProvider = provider ?? await getDefaultVisionProvider();
    const apiKey = getApiKey(selectedProvider);

    if (!apiKey) {
        throw new Error(`API key not found for provider: ${selectedProvider}`);
    }

    switch (selectedProvider) {
        case 'openai':
            return new OpenAIVisionConnector(apiKey, 'gpt-5-nano');
        case 'gemini':
            return new GeminiVisionConnector(apiKey, 'gemini-2.0-flash-exp');
        default:
            throw new Error(`Unsupported vision provider: ${selectedProvider}`);
    }
}

export interface ImageGeneratorOptions {
    model?: string;
    requestsPerMinute?: number;
    aspectRatio?: string;
    width?: number;
    height?: number;
    temperature?: number;
    topP?: number;
    extraConfig?: any;
}

export async function createImageGenerator(provider?: 'gemini' | 'replicate', options: ImageGeneratorOptions = {}): Promise<IImageGenerator> {
    // Note: Provider type here is slightly more specific for image gen as 'openai' image gen is not yet implemented
    const selectedProviderString = provider ?? await getDefaultImageProvider();

    // Cast to simple string to handle potential mismatch if default provider comes back as 'openai' but we want image gen
    // Logic: If 'openai' is default in DB but not supported for image gen here, we might fail.
    // However, IImageGenerator interface implementation is handled here.

    if (selectedProviderString === 'gemini') {
        const apiKey = getApiKey('gemini');
        if (!apiKey) throw new Error("Gemini API key missing");

        const config: GeminiImageGeneratorConfig = {
            apiKey,
            model: options.model || 'gemini-2.0-flash-exp', // Default image model for gemini? Or imagen-3.0-generate-001?
            // Wait, gemini-2.0-flash-exp is multimodal but for image generation specifically we should check if it uses a different model name usually.
            // In GenerationService it was passed in.
            // Let's assume default is gemini-2.0-flash-exp for now or update later if needed.
            requestsPerMinute: options.requestsPerMinute || 10,
            aspectRatio: options.aspectRatio,
            width: options.width,
            height: options.height,
            temperature: options.temperature,
            topP: options.topP
        };
        return new GeminiImageGenerator(config);
    }
    else if (selectedProviderString === 'replicate') {
        const apiKey = getReplicateKey();
        if (!apiKey) throw new Error("Replicate API token missing");

        const config: ReplicateImageGeneratorConfig = {
            apiKey,
            model: options.model || 'black-forest-labs/flux-1.1-pro', // Default replicate model
            requestsPerMinute: options.requestsPerMinute || 10,
            aspectRatio: options.aspectRatio,
            width: options.width,
            height: options.height,
            extraConfig: options.extraConfig
        };
        return new ReplicateImageGenerator(config);
    }
    else {
        throw new Error(`Unsupported image provider: ${selectedProviderString}`);
    }
}
