import { GenerationResult } from "../generation-types";

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

export interface AnalysisContext {
    mood?: string;
    subject?: string;
    goal?: string;
}

export interface SynthesisResult {
    objective: string;
    constraints: string;
    styleDefinition: string;
}

/**
 * Text-only AI operations (no vision)
 */
export interface ITextConnector {
    /**
     * Generate a chat completion
     */
    chat(systemPrompt: string, userMessage: string): Promise<string>;

    /**
     * Synthesize space parameters from analyses
     */
    synthesizeSpaceParams(name: string, analyses: string[], context?: AnalysisContext): Promise<SynthesisResult>;

    /**
     * Build a reusable space prompt
     */
    buildSpacePrompt(request: SpacePromptRequest): Promise<string>;

    /**
     * Standardize a user request against a space prompt
     */
    standardizeRequest(spacePrompt: string, userRequest: string): Promise<string>;
}

/**
 * Vision-enabled AI operations
 */
export interface IVisionConnector extends ITextConnector {
    /**
     * Analyze a reference image
     */
    analyzeReference(reference: ReferenceImageInput, context?: AnalysisContext): Promise<string>;
}

/**
 * Image generation operations
 */
export interface IImageGenerator {
    generateImage(prompt: string, systemPrompt?: string): Promise<GenerationResult>;
}

export type AIProvider = 'openai' | 'gemini' | 'anthropic';
