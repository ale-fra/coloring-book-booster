'use server';

import { db } from '@/lib/db/drizzle';
import { appModels, appSettings, users, userSettings, userHistory, userPresets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ModelConfig, Preset, HistoryItem, GenerationResult } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import Replicate from "replicate";
import serverLogger from '@/lib/server-logger';

export async function logAIInteraction(level: 'info' | 'error', message: string, meta?: any) {
    try {
        if (level === 'error') {
            serverLogger.error(message, meta);
        } else {
            serverLogger.info(message, meta);
        }
    } catch (err) {
        console.error('Failed to write server log:', err);
    }
}

import { auth, signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';

// Helper to get current user
async function getCurrentUser() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Not authenticated');
    }

    const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email)
    });

    if (!user) throw new Error('User not found');
    return user;
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

export async function registerUser(prevState: string | undefined, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return 'Please provide all fields.';
    }

    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (existingUser) {
        return 'User already exists.';
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultCredits = (await db.query.appSettings.findFirst())?.defaultCredits || 250;

    const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        credits: defaultCredits
    }).returning();

    // Initialize settings
    await db.insert(userSettings).values({
        userId: newUser.id,
        modelPreferences: {}
    });

    // We can't automatically sign in with credentials provider in server action easily without redirecting to login
    // or using a client-side flow. For simplicity, we'll redirect to login.
    return 'success';
}

export async function logout() {
    await signOut();
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



export async function getModelPreferences(modelId?: string) {
    const s = await getSettings();
    const prefs = (s?.modelPreferences as Record<string, any>) || {};
    if (modelId) {
        return prefs[modelId] || {};
    }
    return prefs;
}

export async function saveModelPreferences(modelId: string, preferences: { aspectRatio: string, width?: number, height?: number }) {
    const user = await getCurrentUser();
    const existing = await getSettings();

    // Validate dimensions
    if (preferences.width && preferences.width > 1024) throw new Error("Width cannot exceed 1024");
    if (preferences.height && preferences.height > 1024) throw new Error("Height cannot exceed 1024");

    const currentPrefs = (existing?.modelPreferences as Record<string, any>) || {};
    const newPrefs = {
        ...currentPrefs,
        [modelId]: preferences
    };

    if (existing) {
        await db.update(userSettings).set({ modelPreferences: newPrefs }).where(eq(userSettings.id, existing.id));
    } else {
        await db.insert(userSettings).values({ userId: user.id, modelPreferences: newPrefs });
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

export async function updateHistoryItem(item: Omit<HistoryItem, 'userId'>) {
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

// Replicate Action
export async function generateImageWithReplicateAction(
    apiKey: string,
    model: string,
    input: any
): Promise<{ imageUrl?: string; error?: string }> {
    try {
        const Replicate = (await import("replicate")).default;
        const replicate = new Replicate({ auth: apiKey });

        const output = await replicate.run(model as any, { input });

        let imageUrl: string | undefined;

        if (Array.isArray(output)) {
            const firstItem = output[0];
            if (typeof firstItem === 'string') {
                imageUrl = firstItem;
            } else if (firstItem && typeof firstItem === 'object' && 'url' in firstItem) {
                imageUrl = (firstItem as any).url().toString();
            }
        } else if (typeof output === 'string') {
            imageUrl = output;
        } else if (output && typeof output === 'object' && 'url' in output) {
            imageUrl = (output as any).url().toString();
        } else {
            console.log("Unknown Replicate output format:", output);
            return { error: "Unknown output format from Replicate" };
        }

        if (imageUrl) {
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const dataUri = `data:${mimeType};base64,${base64}`;

            return { imageUrl: dataUri };
        } else {
            return { error: "No image URL received from Replicate" };
        }
    } catch (error: any) {
        console.error("Replicate Action Error:", error);
        return { error: error.message || "Unknown Replicate error" };
    }
}

