
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { db } from './drizzle';
import { systemConfigs } from './schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_ANALYSIS_PROMPT, DEFAULT_SYNTHESIS_PROMPT, DEFAULT_GENERATION_PROMPT, DEFAULT_STANDARDIZATION_PROMPT, DEFAULT_SPACE_PROMPT_GENERATION_PROMPT } from '../prompts';

const newConfigs = [
    // Providers
    { key: 'default_text_provider', value: 'gemini', description: 'Default provider for text operations', group: 'ai_providers' },
    { key: 'default_vision_provider', 'value': 'openai', description: 'Default provider for vision operations', group: 'ai_providers' },
    { key: 'default_image_provider', 'value': 'gemini', description: 'Default provider for image generation', group: 'ai_providers' },

    // Space Prompts
    { key: 'space_analysis_prompt', value: DEFAULT_ANALYSIS_PROMPT, description: 'Prompt for analyzing reference images', group: 'space_prompts' },
    { key: 'space_synthesis_prompt', value: DEFAULT_SYNTHESIS_PROMPT, description: 'Prompt for combining analyses into JSON', group: 'space_prompts' },
    { key: 'space_generation_prompt', value: DEFAULT_GENERATION_PROMPT, description: 'Prompt for building reusable space prompts', group: 'space_prompts' },
    { key: 'space_standardization_prompt', value: DEFAULT_STANDARDIZATION_PROMPT, description: 'Prompt for normalizing user requests', group: 'space_prompts' },

    // Model Specific Prompts (using the same default for now but separated logic)
    // We reuse DEFAULT_SPACE_PROMPT_GENERATION_PROMPT which contains {targetModel} placeholder
    { key: 'space_system_prompt_gemini', value: DEFAULT_SPACE_PROMPT_GENERATION_PROMPT, description: 'System prompt template for Gemini', group: 'space_prompts' },
    { key: 'space_system_prompt_flux', value: DEFAULT_SPACE_PROMPT_GENERATION_PROMPT, description: 'System prompt template for Flux', group: 'space_prompts' },
];

async function seedAiConfig() {
    console.log('Seeding AI configurations...');
    try {
        for (const config of newConfigs) {
            await db.insert(systemConfigs).values(config).onConflictDoUpdate({
                target: systemConfigs.key,
                set: { value: config.value, description: config.description, group: config.group }
            });
            console.log(`Upserted config: ${config.key}`);
        }

        // Cleanup old keys
        const keysToDelete = ['space_prompt_generation_prompt'];
        for (const key of keysToDelete) {
            await db.delete(systemConfigs).where(eq(systemConfigs.key, key));
            console.log(`Deleted legacy config: ${key}`);
        }

        console.log('AI configuration seeding completed.');
    } catch (error) {
        console.error('Error seeding AI configurations:', error);
        process.exit(1);
    }
}

seedAiConfig();
