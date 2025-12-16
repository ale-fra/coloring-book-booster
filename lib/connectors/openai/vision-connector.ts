import { IVisionConnector, ReferenceImageInput } from '../interfaces';
import { OpenAITextConnector } from './text-connector';
import { getSystemConfig } from '../../config';
import { DEFAULT_ANALYSIS_PROMPT } from '../../prompts';

export class OpenAIVisionConnector extends OpenAITextConnector implements IVisionConnector {

    constructor(apiKey: string, model: string = 'gpt-5-nano') {
        super(apiKey, model);
    }

    async analyzeReference(reference: ReferenceImageInput): Promise<string> {
        const analysisPrompt = await getSystemConfig('space_analysis_prompt', DEFAULT_ANALYSIS_PROMPT);

        return this.internalChat([
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
        ], 0.2);
    }
}
