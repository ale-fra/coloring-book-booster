
import { pgTable, text, integer, boolean, real, timestamp, jsonb, uuid, pgSchema } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const outlinefactory = pgSchema('outlinefactory');

// User Tables
export const rolesEnum = outlinefactory.enum('role', ['admin', 'member']);
export const subscriptionTiersEnum = outlinefactory.enum('subscription_tier', ['starter', 'pro', 'max']);

export const users = outlinefactory.table('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    role: rolesEnum('role').default('member').notNull(),
    subscriptionTier: subscriptionTiersEnum('subscription_tier').default('starter').notNull(),
    isAdmin: boolean('is_admin').default(false), // Deprecated, keeping for backward compatibility during migration
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
// App/Global Tables
// App/Global Tables

export const systemConfigs = outlinefactory.table('system_configs', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    description: text('description'),
    group: text('group'),
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

export const spaces = outlinefactory.table('spaces', {
    id: text('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    objective: text('objective').notNull(),
    theme: text('theme'),
    constraints: text('constraints'),
    styleDefinition: text('style_definition'),
    prompt: text('prompt'),
    status: text('status').default('draft'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const spaceImages = outlinefactory.table('space_images', {
    id: text('id').primaryKey(),
    spaceId: text('space_id').references(() => spaces.id).notNull(),
    name: text('name'),
    mimeType: text('mime_type'),
    dataUrl: text('data_url'),
    analysis: text('analysis'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const aiLogs = outlinefactory.table('ai_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    timestamp: timestamp('timestamp').defaultNow(),
    provider: text('provider').notNull(),
    model: text('model'),
    input: text('input'),
    output: text('output'),
    status: text('status'),
    durationMs: integer('duration_ms'),
    userId: uuid('user_id'),
});
