import { db } from '@/lib/db/drizzle';
import { systemConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function getSystemConfig(key: string, defaultValue: string): Promise<string> {
    try {
        const config = await db.select().from(systemConfigs).where(eq(systemConfigs.key, key)).limit(1);

        if (config.length > 0) {
            return config[0].value;
        }

        // Optional: Insert default value if not found, so it appears in the DB for editing
        // For now, we just return the default to avoid side effects during read
        return defaultValue;
    } catch (error) {
        console.error(`Failed to fetch system config for key: ${key}`, error);
        return defaultValue;
    }
}

export async function setSystemConfig(key: string, value: string, description?: string, group?: string): Promise<void> {
    try {
        await db.insert(systemConfigs).values({
            key,
            value,
            description,
            group
        }).onConflictDoUpdate({
            target: systemConfigs.key,
            set: { value, description, group }
        });
    } catch (error) {
        console.error(`Failed to set system config for key: ${key}`, error);
        throw error;
    }
}
