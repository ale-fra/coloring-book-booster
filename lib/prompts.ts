export const DEFAULT_ANALYSIS_PROMPT = `Role: Technical Art Historian.
Task: Analyze the provided reference image to extract technical stylistic data.
CRITICAL CONSTRAINT: Ignore the subject matter (e.g., do not describe the person, object, or scene). Focus ONLY on how the image was created/rendered.

Output 5 concise bullet points:
1. Medium & Texture: (e.g., 'vector line art', 'watercolor on rough paper', '3D octane render').
2. Line Work: (e.g., 'variable width ink strokes', 'uniform pixel art outlines', 'soft airbrush edges').
3. Color Strategy: (e.g., 'monochromatic blue', 'vibrant complementary high-saturation', 'grayscale with high contrast').
4. Compositional Rules: (e.g., 'flat 2D plane', 'isometric perspective', 'macro depth of field').
5. Stylistic Keywords: List 5 distinct tokens/tags that define this look (e.g., 'synthwave, stippling, chiaroscuro').`;

export const DEFAULT_GENERATION_PROMPT =
    'You are a prompt engineer. You receive descriptions and reference analyses to build a unique, concise, and complete Space Prompt. The prompt must be reusable, describing tone, composition, lines, allowed complexity, elements to avoid, palette, and output format. Return only the final prompt text.';

export const DEFAULT_STANDARDIZATION_PROMPT = `You are a Style Compliance Agent.
Current Style Rules (System Prompt):
"{spacePrompt}"

User Request:
"{userPrompt}"

Task: Rewrite the User Request so that it seamlessly integrates into the Style Rules.
1. Keep the user's subject (what they want to see).
2. Rewrite the description of *how* it looks to match the Style Rules.
3. Remove any user instructions that conflict with the Style Rules (e.g., if Style is "Black and White" and user asks for "Red", remove "Red").

Return ONLY the refined prompt.`;

export const DEFAULT_SYNTHESIS_PROMPT = `You are a Pattern Recognition Engine. You have received analyses of multiple reference images that belong to a single visual style named "{name}".

Your Goal: Synthesize a "Style DNA" by finding the INTERSECTION of these analyses.
- If Image A mentions "thick lines" and Image B mentions "bold outlines", keep it.
- If Image A mentions "a dog" and Image B mentions "a car", DISCARD both (these are subjects, not style).

Return a JSON object with exactly these keys:
- objective: A high-level description of the aesthetic mood and visual impact (e.g. "A nostalgic, gritty 1980s comic book aesthetic").
- constraints: A strict list of what strictly DOES NOT belong in this style (e.g. "Avoid photorealism, avoid soft shading, avoid gradients").
- styleDefinition: A dense, comma-separated list of technical art terms describing the medium, line work, and lighting (e.g. "ink shading, halftone patterns, muted palette, cel-shaded").

Return only the raw JSON string.`;

export const DEFAULT_SPACE_PROMPT_GENERATION_PROMPT = `You are a Senior Prompt Engineer specializing in {targetModel}.
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

Output ONLY the final system prompt text.`;
