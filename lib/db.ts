

export { type GenerationResult } from './generation';
import { GenerationResult } from './generation';

export interface Preset {
    id: string;
    userId: string;
    title: string;
    prompt: string;
    createdAt: number | Date;
}

export interface Settings {
    id: string;
    userId: string;
    enhancementPrompt?: string;
    enhancementTemperature?: number;
    enhancementThinkingEnabled?: boolean;
    enhancementSearchEnabled?: boolean;
    aspectRatio?: string;
}

// App Settings (Global)
export interface AppSettings {
    id: string;
    maintenanceMode: boolean;
    defaultCredits: number;
    announcement?: string;
}

export interface ModelConfig {
    id: string;
    name: string;
    dailyLimit: number;
    tpm: number;
    isDefault?: boolean;
    type: 'image' | 'text';
    provider?: 'gemini' | 'replicate';
    config?: any; // JSONB
    temperature?: number;
    topP?: number;
}

export interface HistoryItem {
    id: string;
    userId: string;
    timestamp: number | Date;
    presetName: string;
    modelName: string;
    results: GenerationResult[];
}

