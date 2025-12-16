export const DEFAULT_ANALYSIS_PROMPT = `
Role: Visual Taxonomy Expert.
Task: Analyze the provided reference image to extract objectively verifiable stylistic data.
CRITICAL CONSTRAINT: Be LITERAL. If the image is simple, describe it as simple. Do not hallucinate textures (like paper grain or grunge) if they are not clearly visible.

Output 5 concise bullet points:
1. Medium & Fidelity: (e.g., 'digital vector line art', 'clean SVG style', 'marker on paper').
2. Line Work: Describe the stroke weight and consistency (e.g., 'uniform thick mono-weight lines', 'tapered variable width', 'sketchy/broken lines').
3. Shading & Texture: (e.g., 'ZERO shading / flat white', 'solid black fills', 'stippling'). If none, say "None".
4. Color Palette: (e.g., 'black and white binary', 'grayscale', 'flat colors').
5. Key Visual Descriptors: List 5 literal tags (e.g., 'coloring book, outline-only, geometric, minimalist, clip-art').
`;

export const DEFAULT_GENERATION_PROMPT =
    'You are a prompt engineer. You receive descriptions and reference analyses to build a unique, concise, and complete Space Prompt. The prompt must be reusable, describing tone, composition, lines, allowed complexity, elements to avoid, palette, and output format. Return only the final prompt text.';

export const DEFAULT_SYNTHESIS_PROMPT = `
You are a Style Consistency Engine. You have received analyses of multiple reference images for a style named "{name}".

Your Goal: Create a unified Style Definition.
CRITICAL: If the analyses describe simple, clean line art, DO NOT add complex textures like "grunge", "noise", or "paper grain" unless ALL images have it.

Return a JSON object with exactly these keys:
- objective: A clear, literal description of the visual style (e.g. "Clean, bold-line coloring book art suitable for children").
- constraints: A strict list of what to avoid (e.g. "No gray, no shading, no colors, no broken lines, no complex background").
- styleDefinition: A comma-separated list of technical tags describing the line quality and rendering (e.g. "vector art, bold outline, mono-weight line, black and white, flat, 2D, minimal detail").

Return only the raw JSON string. Do not include markdown formatting.
`;

export const DEFAULT_SPACE_PROMPT_GENERATION_PROMPT = `
You are a Senior Prompt Engineer specializing in {targetModel}.
Your goal is to convert raw style data into a highly optimized System Prompt that enforces a specific visual style on ANY user request.

INPUT DATA:
- Style Name: {name}
- Aesthetic Goal: {objective}
- Negative Constraints: {constraints}
- Tech Specs: {styleDefinition}

STRATEGY FOR {targetModel}:
{strategy}

TASK:
Write the System Prompt.
- If the model is Flux/Stable Diffusion: Focus on comma-separated tags, weighting, and token density.
- If the model is Gemini/DALL-E: Focus on natural language description, describing the "artistic medium" and "camera setup".

Output ONLY the final system prompt text. Do not include introductory text.
`;

export const DEFAULT_STANDARDIZATION_PROMPT = `
You are a Style Compliance Agent.
Your goal is to rewrite a user's request so that it perfectly adheres to a specific set of Style Rules.

STYLE RULES:
<style_rules>
{spacePrompt}
</style_rules>

USER REQUEST:
<user_request>
{userPrompt}
</user_request>

INSTRUCTIONS:
1. Extract the subject from <user_request> (e.g. "a robot").
2. Rewrite the prompt to describe that subject using ONLY the visual language in <style_rules>.
3. CRITICAL: If <style_rules> mentions "no shading" or "black and white", you must explicitly remove any references to color, lighting, or 3D depth from the User Request.
4. Output ONLY the final prompt.
`;
