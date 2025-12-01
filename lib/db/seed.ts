
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from './drizzle';
import { appModels, appSettings, users, userSettings } from './schema';
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
            topP: 0.8
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
            aspect_ratio: "custom",
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

        // Seed App Settings (Global)
        const existingAppSettings = await db.select().from(appSettings);
        if (existingAppSettings.length === 0) {
            await db.insert(appSettings).values({
                defaultCredits: 250,
                maintenanceMode: false
            });
            console.log('Inserted global app settings');
        } else {
            console.log('Global app settings already exist');
        }

        // Seed Demo User
        const demoEmail = 'demo@example.com';
        let demoUser = await db.query.users.findFirst({
            where: eq(users.email, demoEmail)
        });

        if (!demoUser) {
            console.log('Creating demo user...');
            const [newUser] = await db.insert(users).values({
                email: demoEmail,
                credits: 1000
            }).returning();
            demoUser = newUser;
            console.log(`Created demo user: ${demoUser.id}`);
        } else {
            console.log(`Demo user already exists: ${demoUser.id}`);
        }

        // Seed User Settings for Demo User
        const existingUserSettings = await db.query.userSettings.findFirst({
            where: eq(userSettings.userId, demoUser.id)
        });

        if (!existingUserSettings) {
            await db.insert(userSettings).values({
                userId: demoUser.id,
                aspectRatio: '1:1',
                enhancementTemperature: 0.3,
                enhancementThinkingEnabled: false,
                enhancementSearchEnabled: false
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
