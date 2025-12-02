
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../lib/db/drizzle';
import { appModels, appSettings, users, userSettings, userHistory, userPresets, spaces, spaceImages } from '../lib/db/schema';
import { count } from 'drizzle-orm';

async function verify() {
    console.log('Verifying database content...');

    try {
        const modelsCount = await db.select({ count: count() }).from(appModels);
        console.log(`App Models count: ${modelsCount[0].count}`);

        const appSettingsCount = await db.select({ count: count() }).from(appSettings);
        console.log(`App Settings count: ${appSettingsCount[0].count}`);

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
