export const DEFAULT_ANALYSIS_PROMPT =
    'Analyze this reference image and provide 3-5 concise bullet points covering: line style, color palette (or lack thereof), complexity, composition, and recurring elements to maintain or avoid.';

export const DEFAULT_GENERATION_PROMPT =
    'You are a prompt engineer. You receive descriptions and reference analyses to build a unique, concise, and complete Space Prompt. The prompt must be reusable, describing tone, composition, lines, allowed complexity, elements to avoid, palette, and output format. Return only the final prompt text.';

export const DEFAULT_STANDARDIZATION_PROMPT =
    'Take the following Space Prompt as a fixed style rule. Receive a user request and transform it into a standardized, clean, and consistent prompt that faithfully respects the Space. Include necessary corrections and adjustments to maintain composition, detail level, and established prohibitions.';

export const DEFAULT_SYNTHESIS_PROMPT = `
    Based on the following image analyses for a style named "{name}", synthesize the core parameters for a generative AI model.
    
    Analyses:
    {analyses}
    
    Return a JSON object with exactly these keys:
    - objective: A clear, positive description of what the style achieves (visual characteristics, mood).
    - constraints: What should be avoided to maintain this style (negative constraints).
    - styleDefinition: A concise, high-level definition of the style (e.g. "Vintage Comic Book", "Minimalist Line Art").
    
    Do not include markdown formatting, just the raw JSON string.
`;

export const DEFAULT_SPACE_PROMPT_GENERATION_PROMPT = `You are an expert Prompt Engineer. Your task is to write a "System Prompt" that will be used by an AI Image Generator to strictly enforce a specific visual style.

TARGET MODEL: {targetModel}

STRATEGY:
{strategy}

INPUT DATA:
- Style Name: {name}
- Objective: {objective}
- Constraints (Negative): {constraints}
- Style Definition: {styleDefinition}

OUTPUT:
Return ONLY the generated System Prompt. Do not include "Here is the prompt" or markdown formatting.`;
