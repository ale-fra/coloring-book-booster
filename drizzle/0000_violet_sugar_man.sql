CREATE SCHEMA "outlinefactory";
--> statement-breakpoint
CREATE TABLE "outlinefactory"."app_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"daily_limit" integer NOT NULL,
	"tpm" integer NOT NULL,
	"is_default" boolean DEFAULT false,
	"type" text NOT NULL,
	"provider" text DEFAULT 'gemini',
	"config" jsonb
);
--> statement-breakpoint
CREATE TABLE "outlinefactory"."app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenance_mode" boolean DEFAULT false,
	"default_credits" integer DEFAULT 250,
	"announcement" text
);
--> statement-breakpoint
CREATE TABLE "outlinefactory"."user_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"preset_name" text NOT NULL,
	"model_name" text NOT NULL,
	"results" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlinefactory"."user_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outlinefactory"."user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"enhancement_prompt" text,
	"enhancement_temperature" real DEFAULT 0.3,
	"enhancement_thinking_enabled" boolean DEFAULT false,
	"enhancement_search_enabled" boolean DEFAULT false,
	"model_preferences" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "outlinefactory"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"credits" integer DEFAULT 0,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "outlinefactory"."user_history" ADD CONSTRAINT "user_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "outlinefactory"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlinefactory"."user_presets" ADD CONSTRAINT "user_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "outlinefactory"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlinefactory"."user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "outlinefactory"."users"("id") ON DELETE no action ON UPDATE no action;