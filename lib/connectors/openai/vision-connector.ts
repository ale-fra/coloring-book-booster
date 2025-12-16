import { IVisionConnector, ReferenceImageInput, AnalysisContext } from '../interfaces';
import { OpenAITextConnector } from './text-connector';
import { getSystemConfig } from '../../config';
import { DEFAULT_ANALYSIS_PROMPT } from '../../prompts';

export class OpenAIVisionConnector extends OpenAITextConnector implements IVisionConnector {

    constructor(apiKey: string, model: string = 'gpt-5-nano') {
        super(apiKey, model);
    }

    async analyzeReference(reference: ReferenceImageInput, context?: AnalysisContext): Promise<string> {
        let analysisPrompt = await getSystemConfig('space_analysis_prompt', DEFAULT_ANALYSIS_PROMPT);

        // Inject Context if available
        if (context) {
            const contextStr = `\n\nCONTEXT PRIORS (User Provided):\n` +
                (context.mood ? `- Mood/Vibe: ${context.mood}\n` : '') +
                (context.subject ? `- Subject/Topic: ${context.subject}\n` : '') +
                (context.goal ? `- Creative Goal: ${context.goal}\n` : '') +
                `\nINSTRUCTION: Allow these priors to focus your analysis. If the user says "clean", ignore accidental messiness. If they say "sketchy", look for that.`;

            analysisPrompt += contextStr;
        }

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
