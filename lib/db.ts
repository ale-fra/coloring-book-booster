

export { type GenerationResult } from './generation-types';
import { GenerationResult } from './generation-types';

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

export const SUBSCRIPTION_LIMITS = {
    starter: { credits: 100, features: ['basic'] },
    pro: { credits: 500, features: ['basic', 'advanced'] },
    max: { credits: 1000, features: ['all'] },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_LIMITS;
export type Role = 'admin' | 'member';

