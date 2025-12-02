
import { pgTable, text, integer, boolean, real, timestamp, json } from 'drizzle-orm/pg-core';

export const settings = pgTable('settings', {
    id: text('id').primaryKey(), // 'global'
    apiKey: text('api_key'),
    replicateApiKey: text('replicate_api_key'),
    enhancementPrompt: text('enhancement_prompt'),
    enhancementTemperature: real('enhancement_temperature').default(0.3),
    enhancementThinkingEnabled: boolean('enhancement_thinking_enabled').default(false),
    enhancementSearchEnabled: boolean('enhancement_search_enabled').default(false),
    aspectRatio: text('aspect_ratio').default('1:1'),
    credits: integer('credits').default(250),
});

export const models = pgTable('models', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    dailyLimit: integer('daily_limit').notNull(),
    tpm: integer('tpm').notNull(),
    temperature: real('temperature'),
    topP: real('top_p'),
    isDefault: boolean('is_default').default(false),
    type: text('type').notNull(), // 'image' | 'text'
    provider: text('provider').default('gemini'), // 'gemini' | 'replicate'
    config: json('config'),
});

export const presets = pgTable('presets', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    prompt: text('prompt').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const spaces = pgTable('spaces', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const spaceImages = pgTable('space_images', {
    id: text('id').primaryKey(),
    spaceId: text('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    prompt: text('prompt'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
