
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { db } from './drizzle';
import { appModels, systemConfigs, users, userSettings } from './schema';
import { eq } from 'drizzle-orm';

const initialModels = [
    {
        name: "models/gemini-flash-latest",
        dailyLimit: 100,
        tpm: 60,
        isDefault: true,
        type: "text",
        provider: "gemini",
        config: {}
    },
    {
        name: "gemini-2.5-flash-image",
        dailyLimit: 2000,
        tpm: 500,
        isDefault: true,
        type: "image",
        provider: "gemini",
        config: {
            temperature: 0.3,
            topP: 0.8,
            enhancement_prompt: `### SYSTEM ROLE ###
You are an expert AI Prompt Engineer specializing in creating "Accessible Coloring Book" pages for seniors and beginners.
Your goal is to convert simple user inputs into highly optimized text-to-image prompts.

### TARGET AUDIENCE SPECS ###
The images are for people with dementia or motor control limitations. The style MUST strictly adhere to:
1.  **Thick, Bold Outlines:** For visibility.
2.  **Large Empty Spaces:** Easy to color without going over the lines.
3.  **Low Complexity:** No tiny details, no "mandala" patterns, no shading, no greyscale.
4.  **Friendly/Calm Subjects:** If the subject is alive, it must look friendly.

### OUTPUT FORMAT ###
For every input, output ONLY the final prompt block following this exact template:

\`Bold thick line art drawing of [SUBJECT MODIFIED FOR SIMPLICITY], centered, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic\`

*(Note: --ar 17:22 sets the aspect ratio to 8.5:11 Portrait)*

### FEW-SHOT EXAMPLES ###

Input: a snowman wearing a scarf
Output: Bold thick line art drawing of a cheerful snowman wearing a scarf, isolated, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic

Input: a basket of flowers
Output: Bold thick line art drawing of a simple woven basket holding three large tulips, centered, distinct outlines, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic

Input: a sleeping cat
Output: Bold thick line art drawing of a cute cat sleeping on a rug, minimal details, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic

### YOUR TASK ###
Convert the following Input into the optimized Output format.`,
            enhancement_temperature: 0.3,
            enhancement_thinking: false,
            enhancement_search: false
        }
    },
    {
        name: "black-forest-labs/flux-2-dev",
        dailyLimit: 100,
        tpm: 10,
        isDefault: false,
        type: "image",
        provider: "replicate",
        config: {
            go_fast: false,
            input_images: [],
            aspect_ratio: ["custom"],
            width: 791,
            height: 1024
        }
    }
];

async function seed() {
    console.log('Seeding database...');

    try {
        // Seed App Models
        for (const model of initialModels) {
            // Check if model exists by name (since we use random UUIDs now)
            const existing = await db.select().from(appModels).where(eq(appModels.name, model.name));
            if (existing.length === 0) {
                await db.insert(appModels).values(model);
                console.log(`Inserted model: ${model.name}`);
            } else {
                console.log(`Model already exists: ${model.name}`);
            }
        }

        // Seed System Configs
        const defaultConfigs = [
            { key: 'default_credits', value: '250', description: 'Default credits for new users', group: 'system' },
            { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', group: 'system' }
        ];

        for (const config of defaultConfigs) {
            await db.insert(systemConfigs).values(config).onConflictDoNothing();
        }
        console.log('Seeded system configs');

        // Seed Demo User
        const demoEmail = 'demo@example.com';
        let demoUser = await db.query.users.findFirst({
            where: eq(users.email, demoEmail)
        });

        if (!demoUser) {
            console.log('Creating demo user...');
            const bcrypt = await import('bcryptjs');
            const passwordHash = await bcrypt.hash('password123', 10);

            const [newUser] = await db.insert(users).values({
                email: demoEmail,
                credits: 1000,
                passwordHash: passwordHash,
                isAdmin: true
            }).returning();
            demoUser = newUser;
            console.log(`Created demo user: ${demoUser.id}`);
        } else {
            console.log(`Demo user already exists: ${demoUser.id}`);
            // Update password if it's missing (migration path)
            if (!demoUser.passwordHash) {
                console.log('Updating demo user password...');
                const bcrypt = await import('bcryptjs');
                const passwordHash = await bcrypt.hash('password123', 10);
                await db.update(users).set({ passwordHash }).where(eq(users.id, demoUser.id));
            }
        }

        // Seed User Settings for Demo User
        const existingUserSettings = await db.query.userSettings.findFirst({
            where: eq(userSettings.userId, demoUser.id)
        });

        if (!existingUserSettings) {
            await db.insert(userSettings).values({
                userId: demoUser.id,
                modelPreferences: {}
            });
            console.log('Inserted user settings for demo user');
        } else {
            console.log('User settings already exist for demo user');
        }

        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seed();
