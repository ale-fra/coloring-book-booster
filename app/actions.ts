'use server';

import { db } from '@/lib/db/drizzle';
import { settings, models, presets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ModelConfig, Preset } from '@/lib/db'; // We will keep types in lib/db.ts or move them
import { revalidatePath } from 'next/cache';

// Settings Actions
export async function getSettings() {
    const result = await db.select().from(settings).where(eq(settings.id, 'global'));
    return result[0];
}

export async function getApiKey() {
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
    const s = await getSettings();
    return s?.apiKey;
}

export async function saveApiKey(apiKey: string) {
    const existing = await getSettings();
    if (existing) {
        await db.update(settings).set({ apiKey }).where(eq(settings.id, 'global'));
    } else {
        await db.insert(settings).values({ id: 'global', apiKey });
    }
    revalidatePath('/');
    revalidatePath('/settings');
}

export async function getReplicateApiKey() {
    if (process.env.REPLICATE_API_KEY) {
        return process.env.REPLICATE_API_KEY;
    }
    const s = await getSettings();
    return s?.replicateApiKey;
}

export async function saveReplicateApiKey(replicateApiKey: string) {
    const existing = await getSettings();
    if (existing) {
        await db.update(settings).set({ replicateApiKey }).where(eq(settings.id, 'global'));
    } else {
        await db.insert(settings).values({ id: 'global', replicateApiKey });
    }
    revalidatePath('/');
    revalidatePath('/settings');
}

export async function getEnhancementPrompt() {
    const s = await getSettings();
    return s?.enhancementPrompt;
}

export async function saveEnhancementPrompt(enhancementPrompt: string) {
    const existing = await getSettings();
    if (existing) {
        await db.update(settings).set({ enhancementPrompt }).where(eq(settings.id, 'global'));
    } else {
        await db.insert(settings).values({ id: 'global', enhancementPrompt });
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
    const existing = await getSettings();
    if (existing) {
        await db.update(settings).set({
            enhancementTemperature: config.temperature,
            enhancementThinkingEnabled: config.thinkingEnabled,
            enhancementSearchEnabled: config.searchEnabled
        }).where(eq(settings.id, 'global'));
    } else {
        await db.insert(settings).values({
            id: 'global',
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
    const existing = await getSettings();
    if (existing) {
        await db.update(settings).set({ aspectRatio }).where(eq(settings.id, 'global'));
    } else {
        await db.insert(settings).values({ id: 'global', aspectRatio });
    }
    revalidatePath('/');
}

export async function getCredits() {
    const s = await getSettings();
    return s?.credits ?? 250;
}

export async function saveCredits(credits: number) {
    const existing = await getSettings();
    if (existing) {
        await db.update(settings).set({ credits }).where(eq(settings.id, 'global'));
    } else {
        await db.insert(settings).values({ id: 'global', credits });
    }
    revalidatePath('/');
}

// Models Actions
export async function getModels(): Promise<ModelConfig[]> {
    const result = await db.select().from(models);
    return result.map(m => ({
        ...m,
        temperature: m.temperature ?? undefined,
        topP: m.topP ?? undefined,
        isDefault: m.isDefault ?? false,
        type: m.type as 'image' | 'text',
        provider: (m.provider ?? 'gemini') as 'gemini' | 'replicate'
    }));
}

export async function addModel(model: Omit<ModelConfig, 'id'>) {
    const id = crypto.randomUUID();

    // Handle default logic
    if (model.isDefault) {
        await db.update(models)
            .set({ isDefault: false })
            .where(eq(models.type, model.type));
    } else {
        // If it's the first model of this type, make it default
        const existing = await db.select().from(models).where(eq(models.type, model.type));
        if (existing.length === 0) {
            model.isDefault = true;
        }
    }

    const newModel = { ...model, id };
    await db.insert(models).values(newModel);
    revalidatePath('/settings');
    return newModel;
}

export async function updateModel(model: ModelConfig) {
    if (model.isDefault) {
        await db.update(models)
            .set({ isDefault: false })
            .where(eq(models.type, model.type));
    }

    await db.update(models)
        .set(model)
        .where(eq(models.id, model.id));

    revalidatePath('/settings');
}

export async function setDefaultModel(id: string) {
    const modelToSet = (await db.select().from(models).where(eq(models.id, id)))[0];
    if (!modelToSet) return;

    await db.update(models)
        .set({ isDefault: false })
        .where(eq(models.type, modelToSet.type));

    await db.update(models)
        .set({ isDefault: true })
        .where(eq(models.id, id));

    revalidatePath('/settings');
}

export async function deleteModel(id: string) {
    const model = (await db.select().from(models).where(eq(models.id, id)))[0];
    if (model?.isDefault) {
        throw new Error("Cannot delete the default model.");
    }
    await db.delete(models).where(eq(models.id, id));
    revalidatePath('/settings');
}

export async function initializeDefaultModels() {
    const countResult = await db.select({ count: models.id }).from(models); // Inefficient count but fine for small table
    const count = countResult.length;

    if (count === 0) {
        const defaultImageModel = {
            id: crypto.randomUUID(),
            name: 'gemini-2.5-flash-image',
            dailyLimit: 2000,
            tpm: 500,
            temperature: 0.3,
            topP: 0.8,
            isDefault: true,
            type: 'image',
            provider: 'gemini'
        };
        await db.insert(models).values(defaultImageModel);

        const defaultTextModel = {
            id: crypto.randomUUID(),
            name: 'models/gemini-flash-latest',
            dailyLimit: 100,
            tpm: 60,
            isDefault: true,
            type: 'text',
            provider: 'gemini'
        };
        await db.insert(models).values(defaultTextModel);
    } else {
        // Check for text model
        const allModels = await db.select().from(models);
        const hasTextModel = allModels.some(m => m.type === 'text');
        if (!hasTextModel) {
            const defaultTextModel = {
                id: crypto.randomUUID(),
                name: 'models/gemini-flash-latest',
                dailyLimit: 100,
                tpm: 60,
                isDefault: true,
                type: 'text',
                provider: 'gemini'
            };
            await db.insert(models).values(defaultTextModel);
        }

        const hasFluxModel = allModels.some(m => m.name === 'black-forest-labs/flux-2-dev');
        if (!hasFluxModel) {
            const fluxModel = {
                id: crypto.randomUUID(),
                name: 'black-forest-labs/flux-2-dev',
                dailyLimit: 100,
                tpm: 10,
                isDefault: false,
                type: 'image',
                provider: 'replicate'
            };
            await db.insert(models).values(fluxModel);
        }
    }
}

// Presets Actions
export async function getPresets() {
    const result = await db.select().from(presets);
    return result.map(p => ({
        ...p,
        createdAt: p.createdAt ? p.createdAt.getTime() : Date.now()
    }));
}

export async function addPreset(preset: Omit<Preset, 'id' | 'createdAt'>) {
    const id = crypto.randomUUID();
    const newPreset = { ...preset, id, createdAt: new Date() };
    await db.insert(presets).values(newPreset);
    revalidatePath('/');
    return newPreset;
}

export async function deletePreset(id: string) {
    await db.delete(presets).where(eq(presets.id, id));
    revalidatePath('/');
}

export async function updatePreset(preset: Preset) {
    await db.update(presets)
        .set({ ...preset, createdAt: new Date(preset.createdAt) }) // Ensure date is Date object
        .where(eq(presets.id, preset.id));
    revalidatePath('/');
}
