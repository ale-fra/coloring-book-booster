
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../lib/db/drizzle';
import { appModels, systemConfigs, users, userSettings, userHistory, userPresets, spaces, spaceImages } from '../lib/db/schema';
import { count } from 'drizzle-orm';

async function verify() {
    console.log('Verifying database content...');

    try {
        const modelsCount = await db.select({ count: count() }).from(appModels);
        console.log(`App Models count: ${modelsCount[0].count}`);

        const systemConfigsCount = await db.select({ count: count() }).from(systemConfigs);
        console.log(`System Configs count: ${systemConfigsCount[0].count}`);

        const usersCount = await db.select({ count: count() }).from(users);
        console.log(`Users count: ${usersCount[0].count}`);

        const userSettingsCount = await db.select({ count: count() }).from(userSettings);
        console.log(`User Settings count: ${userSettingsCount[0].count}`);

        const spacesCount = await db.select({ count: count() }).from(spaces);
        console.log(`Spaces count: ${spacesCount[0].count}`);

        const spaceImagesCount = await db.select({ count: count() }).from(spaceImages);
        console.log(`Space Images count: ${spaceImagesCount[0].count}`);

        const allModels = await db.select().from(appModels);
        console.log('Models:', allModels.map(m => m.name));

    } catch (error) {
        console.error('Error verifying database:', error);
        process.exit(1);
    }
}

verify();
