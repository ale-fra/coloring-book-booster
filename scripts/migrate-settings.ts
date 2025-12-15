import { db } from '../lib/db/drizzle';
import { appSettings, systemConfigs } from '../lib/db/schema';
import {
    DEFAULT_ANALYSIS_PROMPT,
    DEFAULT_GENERATION_PROMPT,
    DEFAULT_STANDARDIZATION_PROMPT,
    DEFAULT_SYNTHESIS_PROMPT,
    DEFAULT_SPACE_PROMPT_GENERATION_PROMPT
} from '../lib/prompts';

async function migrate() {
    console.log('Starting migration of appSettings to system_configs...');

    try {
        const settings = await db.select().from(appSettings).limit(1);
        const currentSettings = settings[0];

        if (!currentSettings) {
            console.log('No appSettings found. Seeding defaults...');
            // Seed defaults if no settings exist
            await seedDefaults();
            return;
        }

        const configsToInsert = [
            {
                key: 'maintenance_mode',
                value: String(currentSettings.maintenanceMode ?? 'false'),
                description: 'Enable maintenance mode to disable user access.',
                group: 'system'
            },
            {
                key: 'default_credits',
                value: String(currentSettings.defaultCredits ?? '250'),
                description: 'Default credits assigned to new users.',
                group: 'system'
            },
            {
                key: 'announcement',
                value: currentSettings.announcement ?? '',
                description: 'Global announcement banner text.',
                group: 'system'
            },
            {
                key: 'space_analysis_prompt',
                value: currentSettings.spaceAnalysisPrompt ?? DEFAULT_ANALYSIS_PROMPT,
                description: 'System prompt for analyzing reference images.',
                group: 'prompts'
            },
            {
                key: 'space_generation_prompt',
                value: currentSettings.spaceGenerationPrompt ?? DEFAULT_GENERATION_PROMPT,
                description: 'System prompt for generating the final Space Prompt.',
                group: 'prompts'
            },
            {
                key: 'space_standardization_prompt',
                value: currentSettings.spaceStandardizationPrompt ?? DEFAULT_STANDARDIZATION_PROMPT,
                description: 'System prompt for standardizing user requests.',
                group: 'prompts'
            },
            // New prompts that weren't in appSettings
            {
                key: 'space_synthesis_prompt',
                value: DEFAULT_SYNTHESIS_PROMPT,
                description: 'System prompt for synthesizing space parameters from analyses.',
                group: 'prompts'
            },
            {
                key: 'space_prompt_generation_prompt',
                value: DEFAULT_SPACE_PROMPT_GENERATION_PROMPT,
                description: 'System prompt for generating a Space Prompt from parameters.',
                group: 'prompts'
            }
        ];

        for (const config of configsToInsert) {
            console.log(`Migrating ${config.key}...`);
            await db.insert(systemConfigs).values(config).onConflictDoUpdate({
                target: systemConfigs.key,
                set: { value: config.value, description: config.description, group: config.group }
            });
        }

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

async function seedDefaults() {
    const defaults = [
        { key: 'maintenance_mode', value: 'false', group: 'system', description: 'Enable maintenance mode.' },
        { key: 'default_credits', value: '250', group: 'system', description: 'Default credits for new users.' },
        { key: 'announcement', value: '', group: 'system', description: 'Global announcement.' },
        { key: 'space_analysis_prompt', value: DEFAULT_ANALYSIS_PROMPT, group: 'prompts', description: 'Analysis prompt.' },
        { key: 'space_generation_prompt', value: DEFAULT_GENERATION_PROMPT, group: 'prompts', description: 'Generation prompt.' },
        { key: 'space_standardization_prompt', value: DEFAULT_STANDARDIZATION_PROMPT, group: 'prompts', description: 'Standardization prompt.' },
        { key: 'space_synthesis_prompt', value: DEFAULT_SYNTHESIS_PROMPT, group: 'prompts', description: 'Synthesis prompt.' },
        { key: 'space_prompt_generation_prompt', value: DEFAULT_SPACE_PROMPT_GENERATION_PROMPT, group: 'prompts', description: 'Prompt generation prompt.' },
    ];

    for (const config of defaults) {
        await db.insert(systemConfigs).values(config).onConflictDoNothing();
    }
    console.log('Defaults seeded.');
}

migrate();
