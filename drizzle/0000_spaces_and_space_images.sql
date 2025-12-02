CREATE TABLE IF NOT EXISTS "settings" (
    "id" text PRIMARY KEY NOT NULL,
    "api_key" text,
    "replicate_api_key" text,
    "enhancement_prompt" text,
    "enhancement_temperature" real DEFAULT 0.3,
    "enhancement_thinking_enabled" boolean DEFAULT false,
    "enhancement_search_enabled" boolean DEFAULT false,
    "aspect_ratio" text DEFAULT '1:1',
    "credits" integer DEFAULT 250
);

CREATE TABLE IF NOT EXISTS "models" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "daily_limit" integer NOT NULL,
    "tpm" integer NOT NULL,
    "temperature" real,
    "top_p" real,
    "is_default" boolean DEFAULT false,
    "type" text NOT NULL,
    "provider" text DEFAULT 'gemini',
    "config" json
);

CREATE TABLE IF NOT EXISTS "presets" (
    "id" text PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "prompt" text NOT NULL,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "spaces" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "space_images" (
    "id" text PRIMARY KEY NOT NULL,
    "space_id" text NOT NULL,
    "image_url" text NOT NULL,
    "prompt" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "space_images" ADD CONSTRAINT "space_images_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
