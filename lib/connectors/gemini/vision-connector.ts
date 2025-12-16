import { IVisionConnector, ReferenceImageInput } from '../interfaces';
import { GeminiTextConnector } from './text-connector';
import { getSystemConfig } from '../../config';
import { DEFAULT_ANALYSIS_PROMPT } from '../../prompts';

export class GeminiVisionConnector extends GeminiTextConnector implements IVisionConnector {

    constructor(apiKey: string, model: string = 'gemini-2.0-flash-exp') {
        super(apiKey, model);
    }

    async analyzeReference(reference: ReferenceImageInput): Promise<string> {
        const analysisPrompt = await getSystemConfig('space_analysis_prompt', DEFAULT_ANALYSIS_PROMPT);

        // Gemini expects base64 data without prefix for inlineData? 
        // SDK usually handles it, but let's check format.
        // GoogleGenAI SDK usually expects { inlineData: { mimeType: ..., data: ... } }

        let base64Data = reference.dataUrl;
        let mimeType = reference.mimeType || 'image/png';

        if (reference.dataUrl.startsWith('data:')) {
            const matches = reference.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        const contents = [
            {
                role: 'user',
                parts: [
                    { text: 'Reference to analyze and synthesize for the Space.' },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ];

        return this.internalGenerate(contents, analysisPrompt, 0.2);
    }
}
