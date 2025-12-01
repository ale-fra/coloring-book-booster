'use server';

import { db } from '@/lib/db/drizzle';
import { appModels, appSettings, users, userSettings, userHistory, userPresets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ModelConfig, Preset, HistoryItem, GenerationResult } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Helper to get current user (Hardcoded Demo User for now)
async function getCurrentUser() {
    const demoEmail = 'demo@example.com';
    const user = await db.query.users.findFirst({
        where: eq(users.email, demoEmail)
    });
    if (!user) throw new Error('Demo user not found');
    return user;
}

// Settings Actions
export async function getSettings() {
    const user = await getCurrentUser();
    const uSettings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, user.id)
    });
    return uSettings;
}

export async function getApiKey() {
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
    // API Keys are no longer in DB for security, but if we had them in user_settings (encrypted), we'd fetch here.
    // For now, return undefined or handle via env vars only as per requirements.
    return undefined;
}

export async function getReplicateApiKey() {
    if (process.env.REPLICATE_API_KEY) {
        return process.env.REPLICATE_API_KEY;
    }
    return undefined;
}

export async function getEnhancementPrompt() {
    const s = await getSettings();
    return s?.enhancementPrompt;
}

export async function saveEnhancementPrompt(enhancementPrompt: string) {
    const user = await getCurrentUser();
    const existing = await getSettings();

    if (existing) {
        await db.update(userSettings).set({ enhancementPrompt }).where(eq(userSettings.id, existing.id));
    } else {
        await db.insert(userSettings).values({ userId: user.id, enhancementPrompt });
    }
}

export async function getEnhancementSettings() {
    const s = await getSettings();
    return {
        temperature: s?.enhancementTemperature ?? 0.3,
        thinkingEnabled: s?.enhancementThinkingEnabled ?? false,
        searchEnabled: s?.enhancementSearchEnabled ?? false
    };
}

export async function saveEnhancementSettings(config: { temperature: number; thinkingEnabled: boolean; searchEnabled: boolean }) {
    const user = await getCurrentUser();
    const existing = await getSettings();

    if (existing) {
        await db.update(userSettings).set({
            enhancementTemperature: config.temperature,
            enhancementThinkingEnabled: config.thinkingEnabled,
            enhancementSearchEnabled: config.searchEnabled
        }).where(eq(userSettings.id, existing.id));
    } else {
        await db.insert(userSettings).values({
            userId: user.id,
            enhancementTemperature: config.temperature,
            enhancementThinkingEnabled: config.thinkingEnabled,
            enhancementSearchEnabled: config.searchEnabled
        });
    }
}

export async function getAspectRatio() {
    const s = await getSettings();
    return s?.aspectRatio || '1:1';
}

export async function saveAspectRatio(aspectRatio: string) {
    const user = await getCurrentUser();
    const existing = await getSettings();

    if (existing) {
        await db.update(userSettings).set({ aspectRatio }).where(eq(userSettings.id, existing.id));
    } else {
        await db.insert(userSettings).values({ userId: user.id, aspectRatio });
    }
    revalidatePath('/');
}

export async function getCredits() {
    const user = await getCurrentUser();
    return user.credits ?? 0;
}

export async function saveCredits(credits: number) {
    const user = await getCurrentUser();
    await db.update(users).set({ credits }).where(eq(users.id, user.id));
    revalidatePath('/');
}

// Models Actions
export async function getModels(): Promise<ModelConfig[]> {
    const result = await db.select().from(appModels);
    return result.map(m => {
        const config = m.config as any || {};
        return {
            id: m.id,
            name: m.name,
            dailyLimit: m.dailyLimit,
            tpm: m.tpm,
            isDefault: m.isDefault ?? false,
            type: m.type as 'image' | 'text',
            provider: (m.provider ?? 'gemini') as 'gemini' | 'replicate',
            config: config,
            // Map config fields back to top-level for compatibility if needed, but better to use config object
            temperature: config.temperature,
            topP: config.topP
        };
    });
}

export async function addModel(model: Omit<ModelConfig, 'id'>) {
    // Models are global (app_models), so we don't need userId.
    // But we should probably restrict this to admin users in future.

    // Handle default logic
    if (model.isDefault) {
        await db.update(appModels)
            .set({ isDefault: false })
            .where(eq(appModels.type, model.type));
    } else {
        // If it's the first model of this type, make it default
        const existing = await db.select().from(appModels).where(eq(appModels.type, model.type));
        if (existing.length === 0) {
            model.isDefault = true;
        }
    }

    const [newModel] = await db.insert(appModels).values({
        name: model.name,
        dailyLimit: model.dailyLimit,
        tpm: model.tpm,
        isDefault: model.isDefault,
        type: model.type,
        provider: model.provider,
        config: model.config || { temperature: model.temperature, topP: model.topP }
    }).returning();

    revalidatePath('/settings');
    return newModel;
}

export async function updateModel(model: ModelConfig) {
    if (model.isDefault) {
        await db.update(appModels)
            .set({ isDefault: false })
            .where(eq(appModels.type, model.type));
    }

    await db.update(appModels)
        .set({
            name: model.name,
            dailyLimit: model.dailyLimit,
            tpm: model.tpm,
            isDefault: model.isDefault,
            type: model.type,
            provider: model.provider,
            config: model.config
        })
        .where(eq(appModels.id, model.id));

    revalidatePath('/settings');
}

export async function setDefaultModel(id: string) {
    const modelToSet = await db.query.appModels.findFirst({ where: eq(appModels.id, id) });
    if (!modelToSet) return;

    await db.update(appModels)
        .set({ isDefault: false })
        .where(eq(appModels.type, modelToSet.type));

    await db.update(appModels)
        .set({ isDefault: true })
        .where(eq(appModels.id, id));

    revalidatePath('/settings');
}

export async function deleteModel(id: string) {
    const model = await db.query.appModels.findFirst({ where: eq(appModels.id, id) });
    if (model?.isDefault) {
        throw new Error("Cannot delete the default model.");
    }
    await db.delete(appModels).where(eq(appModels.id, id));
    revalidatePath('/settings');
}

export async function initializeDefaultModels() {
    // Already handled by seed script, but we can keep this for runtime checks if needed.
    // For now, let's assume seed script did its job.
}

// Presets Actions
export async function getPresets() {
    const user = await getCurrentUser();
    const result = await db.select().from(userPresets).where(eq(userPresets.userId, user.id));
    return result.map(p => ({
        ...p,
        createdAt: p.createdAt ? p.createdAt.getTime() : Date.now()
    }));
}

export async function addPreset(preset: Omit<Preset, 'id' | 'createdAt' | 'userId'>) {
    const user = await getCurrentUser();
    const [newPreset] = await db.insert(userPresets).values({
        userId: user.id,
        title: preset.title,
        prompt: preset.prompt
    }).returning();

    revalidatePath('/');
    return {
        ...newPreset,
        createdAt: newPreset.createdAt ? newPreset.createdAt.getTime() : Date.now()
    };
}

export async function deletePreset(id: string) {
    const user = await getCurrentUser();
    await db.delete(userPresets).where(eq(userPresets.id, id)); // Should also check userId for security
    revalidatePath('/');
}

export async function updatePreset(preset: Preset) {
    const user = await getCurrentUser();
    await db.update(userPresets)
        .set({ title: preset.title, prompt: preset.prompt })
        .where(eq(userPresets.id, preset.id));
    revalidatePath('/');
}

// History Actions
export async function addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp' | 'userId'>) {
    const user = await getCurrentUser();
    const [newItem] = await db.insert(userHistory).values({
        userId: user.id,
        timestamp: new Date(),
        presetName: item.presetName,
        modelName: item.modelName,
        results: item.results
    }).returning();

    return {
        ...newItem,
        results: newItem.results as GenerationResult[]
    };
}

export async function getHistory() {
    const user = await getCurrentUser();
    const items = await db.select().from(userHistory)
        .where(eq(userHistory.userId, user.id))
        .orderBy(desc(userHistory.timestamp));

    return items.map(item => ({
        ...item,
        results: item.results as GenerationResult[]
    }));
}

export async function updateHistoryItem(item: HistoryItem) {
    const user = await getCurrentUser();
    await db.update(userHistory)
        .set({
            presetName: item.presetName,
            modelName: item.modelName,
            results: item.results,
            timestamp: new Date(item.timestamp)
        })
        .where(eq(userHistory.id, item.id));
}

export async function deleteHistoryItem(id: string) {
    const user = await getCurrentUser();
    await db.delete(userHistory).where(eq(userHistory.id, id));
}

export async function clearHistory() {
    const user = await getCurrentUser();
    await db.delete(userHistory).where(eq(userHistory.userId, user.id));
}

