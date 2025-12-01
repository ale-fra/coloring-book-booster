
import { pgTable, text, integer, boolean, real, timestamp, jsonb, uuid, pgSchema } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const outlinefactory = pgSchema('outlinefactory');

// User Tables
export const users = outlinefactory.table('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    credits: integer('credits').default(0),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const userSettings = outlinefactory.table('user_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    enhancementPrompt: text('enhancement_prompt'),
    enhancementTemperature: real('enhancement_temperature').default(0.3),
    enhancementThinkingEnabled: boolean('enhancement_thinking_enabled').default(false),
    enhancementSearchEnabled: boolean('enhancement_search_enabled').default(false),
    modelPreferences: jsonb('model_preferences').default({}),
});

export const userHistory = outlinefactory.table('user_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    timestamp: timestamp('timestamp').notNull(),
    presetName: text('preset_name').notNull(),
    modelName: text('model_name').notNull(),
    results: jsonb('results').notNull(), // Stores GenerationResult[]
});

export const userPresets = outlinefactory.table('user_presets', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    title: text('title').notNull(),
    prompt: text('prompt').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// App/Global Tables
export const appSettings = outlinefactory.table('app_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    maintenanceMode: boolean('maintenance_mode').default(false),
    defaultCredits: integer('default_credits').default(250),
    announcement: text('announcement'),
});

export const appModels = outlinefactory.table('app_models', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    dailyLimit: integer('daily_limit').notNull(),
    tpm: integer('tpm').notNull(),
    isDefault: boolean('is_default').default(false),
    type: text('type').notNull(), // 'image' | 'text'
    provider: text('provider').default('gemini'), // 'gemini' | 'replicate'
    config: jsonb('config'), // Includes temperature, topP, etc.
});
