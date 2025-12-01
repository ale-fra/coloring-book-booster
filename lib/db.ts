import { openDB, DBSchema } from 'idb';
import { GenerationResult } from './gemini';

export interface Preset {
    id: string;
    title: string;
    prompt: string;
    createdAt: number | Date;
}

export interface Settings {
    id: 'global';
    apiKey: string;
    enhancementPrompt?: string;
    enhancementTemperature?: number;
    enhancementThinkingEnabled?: boolean;
    enhancementSearchEnabled?: boolean;
    aspectRatio?: string;
    credits?: number;
    replicateApiKey?: string;
}

export interface ModelConfig {
    id: string;
    name: string;
    dailyLimit: number;
    tpm: number;
    temperature?: number;
    topP?: number;
    isDefault?: boolean;
    type: 'image' | 'text';
    provider?: 'gemini' | 'replicate';
    config?: any;
}

export interface HistoryItem {
    id: string;
    timestamp: number;
    presetName: string;
    modelName: string;
    results: GenerationResult[];
}

interface MyDB extends DBSchema {
    presets: {
        key: string;
        value: Preset;
        indexes: { 'by-title': string };
    };
    settings: {
        key: string;
        value: Settings;
    };
    models: {
        key: string;
        value: ModelConfig;
    };
    history: {
        key: string;
        value: HistoryItem;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'gemini-generator-db';
const DB_VERSION = 5; // Increment version for schema change

export async function getDB() {
    return openDB<MyDB>(DB_NAME, DB_VERSION, {
        async upgrade(db, oldVersion, newVersion, transaction) {
            if (oldVersion < 1) {
                const store = db.createObjectStore('presets', { keyPath: 'id' });
                store.createIndex('by-title', 'title');
            }
            if (oldVersion < 2) {
                db.createObjectStore('settings', { keyPath: 'id' });
                db.createObjectStore('models', { keyPath: 'id' });
            }
            if (oldVersion < 3) {
                const historyStore = db.createObjectStore('history', { keyPath: 'id' });
                historyStore.createIndex('by-timestamp', 'timestamp');
            }
            if (oldVersion < 4) {
                const store = transaction.objectStore('models');
                let cursor = await store.openCursor();
                while (cursor) {
                    const model = cursor.value as any; // Cast to any to access potentially missing fields
                    if (!model.type) {
                        // Heuristic: if name contains 'image' or is the known image model, set as image
                        if (model.name.includes('image') || model.name === 'gemini-3-pro-image-preview') {
                            model.type = 'image';
                        } else {
                            model.type = 'text';
                        }
                        await cursor.update(model);
                    }
                    cursor = await cursor.continue();
                }
            }
            if (oldVersion < 5) {
                const store = transaction.objectStore('models');
                let cursor = await store.openCursor();
                while (cursor) {
                    const model = cursor.value;
                    if (!model.provider) {
                        model.provider = 'gemini';
                        await cursor.update(model);
                    }
                    cursor = await cursor.continue();
                }
            }
        },
    });
}

// Preset functions
export async function addPreset(preset: Omit<Preset, 'id' | 'createdAt'>) {
    const db = await getDB();
    const id = crypto.randomUUID();
    const newPreset: Preset = { ...preset, id, createdAt: Date.now() };
    await db.add('presets', newPreset);
    return newPreset;
}

export async function getPresets() {
    const db = await getDB();
    return db.getAll('presets');
}

export async function deletePreset(id: string) {
    const db = await getDB();
    await db.delete('presets', id);
}

export async function updatePreset(preset: Preset) {
    const db = await getDB();
    await db.put('presets', preset);
}

// Settings functions
export async function getApiKey(): Promise<string | undefined> {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    return settings?.apiKey;
}

export async function saveApiKey(apiKey: string) {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    await db.put('settings', { ...settings, id: 'global', apiKey });
}

export async function getReplicateApiKey(): Promise<string | undefined> {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    return settings?.replicateApiKey;
}

export async function saveReplicateApiKey(replicateApiKey: string) {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    await db.put('settings', { apiKey: '', ...settings, id: 'global', replicateApiKey });
}

export async function getEnhancementPrompt(): Promise<string | undefined> {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    return settings?.enhancementPrompt;
}

export async function saveEnhancementPrompt(enhancementPrompt: string) {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    await db.put('settings', { ...settings, id: 'global', apiKey: settings?.apiKey || '', enhancementPrompt });
}

export async function getEnhancementSettings() {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    return {
        temperature: settings?.enhancementTemperature ?? 0.3,
        thinkingEnabled: settings?.enhancementThinkingEnabled ?? false,
        searchEnabled: settings?.enhancementSearchEnabled ?? false
    };
}

export async function saveEnhancementSettings(config: { temperature: number; thinkingEnabled: boolean; searchEnabled: boolean }) {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    await db.put('settings', {
        ...settings,
        id: 'global',
        apiKey: settings?.apiKey || '',
        enhancementTemperature: config.temperature,
        enhancementThinkingEnabled: config.thinkingEnabled,
        enhancementSearchEnabled: config.searchEnabled
    });
}

export async function getAspectRatio(): Promise<string> {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    return settings?.aspectRatio || '1:1';
}

export async function saveAspectRatio(aspectRatio: string) {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    await db.put('settings', {
        ...settings,
        id: 'global',
        apiKey: settings?.apiKey || '',
        aspectRatio
    });
}

export async function getCredits(): Promise<number> {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    return settings?.credits ?? 250;
}

export async function saveCredits(credits: number) {
    const db = await getDB();
    const settings = await db.get('settings', 'global');
    await db.put('settings', {
        ...settings,
        id: 'global',
        apiKey: settings?.apiKey || '',
        credits
    });
}

// Model functions
export async function getModels(): Promise<ModelConfig[]> {
    const db = await getDB();
    return db.getAll('models');
}

export async function addModel(model: Omit<ModelConfig, 'id'>) {
    const db = await getDB();
    const id = crypto.randomUUID();

    // If this is the first model of this type, make it default
    const allModels = await db.getAll('models');
    const sameTypeModels = allModels.filter(m => m.type === model.type);

    const isDefault = sameTypeModels.length === 0 ? true : (model.isDefault || false);

    if (isDefault) {
        // Unset default for all other models of the same type
        for (const m of sameTypeModels) {
            if (m.isDefault) {
                m.isDefault = false;
                await db.put('models', m);
            }
        }
    }

    const newModel: ModelConfig = { ...model, id, isDefault };
    await db.add('models', newModel);
    return newModel;
}

export async function updateModel(model: ModelConfig) {
    const db = await getDB();

    if (model.isDefault) {
        // Unset default for all other models of the same type
        const allModels = await db.getAll('models');
        for (const m of allModels) {
            if (m.id !== model.id && m.type === model.type && m.isDefault) {
                m.isDefault = false;
                await db.put('models', m);
            }
        }
    }

    await db.put('models', model);
}

export async function setDefaultModel(id: string) {
    const db = await getDB();
    const modelToSet = await db.get('models', id);

    if (!modelToSet) return;

    const allModels = await db.getAll('models');

    for (const m of allModels) {
        if (m.type === modelToSet.type) {
            if (m.id === id) {
                m.isDefault = true;
                await db.put('models', m);
            } else if (m.isDefault) {
                m.isDefault = false;
                await db.put('models', m);
            }
        }
    }
}

export async function deleteModel(id: string) {
    const db = await getDB();
    const model = await db.get('models', id);
    if (model?.isDefault) {
        throw new Error("Cannot delete the default model.");
    }
    await db.delete('models', id);
}

export async function initializeDefaultModels() {
    const db = await getDB();
    const count = await db.count('models');
    if (count === 0) {
        const defaultImageModel: ModelConfig = {
            id: crypto.randomUUID(),
            name: 'gemini-2.5-flash-image',
            dailyLimit: 2000,
            tpm: 500,
            temperature: 0.3,
            topP: 0.8,
            isDefault: true,
            type: 'image'
        };
        await db.add('models', defaultImageModel);

        const defaultTextModel: ModelConfig = {
            id: crypto.randomUUID(),
            name: 'models/gemini-flash-latest',
            dailyLimit: 100,
            tpm: 60,
            isDefault: true,
            type: 'text'
        };
        await db.add('models', defaultTextModel);
    } else {
        // Check if we need to add the default text model if it doesn't exist (for existing users)
        const allModels = await db.getAll('models');
        const hasTextModel = allModels.some(m => m.type === 'text');

        if (!hasTextModel) {
            const defaultTextModel: ModelConfig = {
                id: crypto.randomUUID(),
                name: 'models/gemini-flash-latest',
                dailyLimit: 100,
                tpm: 60,
                isDefault: true,
                type: 'text',
                provider: 'gemini'
            };
            await db.add('models', defaultTextModel);
        }

        const hasFluxModel = allModels.some(m => m.name === 'black-forest-labs/flux-2-dev');
        if (!hasFluxModel) {
            const fluxModel: ModelConfig = {
                id: crypto.randomUUID(),
                name: 'black-forest-labs/flux-2-dev',
                dailyLimit: 100, // Arbitrary limit for now
                tpm: 10, // Arbitrary limit
                isDefault: false,
                type: 'image',
                provider: 'replicate',
                config: {
                    go_fast: false,
                    input_images: [],
                    aspect_ratio: "custom",
                    width: 791,
                    height: 1024
                }
            };
            await db.add('models', fluxModel);
        }
    }
}

// History functions
export async function addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
    const db = await getDB();
    const id = crypto.randomUUID();
    const newItem: HistoryItem = { ...item, id, timestamp: Date.now() };
    console.log('[DEBUG] addHistoryItem called with:', { presetName: item.presetName, modelName: item.modelName, resultsCount: item.results.length });
    await db.add('history', newItem);
    console.log('[DEBUG] addHistoryItem saved successfully, ID:', id);
    return newItem;
}

export async function getHistory() {
    const db = await getDB();
    console.log('[DEBUG] getHistory called');
    try {
        const items = await db.getAllFromIndex('history', 'by-timestamp');
        console.log('[DEBUG] getHistory retrieved items:', items.length);
        return items;
    } catch (error) {
        console.error('[DEBUG] getHistory error:', error);
        throw error;
    }
}

export async function updateHistoryItem(item: HistoryItem) {
    const db = await getDB();
    await db.put('history', item);
}

export async function deleteHistoryItem(id: string) {
    const db = await getDB();
    await db.delete('history', id);
}

export async function clearHistory() {
    const db = await getDB();
    await db.clear('history');
}
