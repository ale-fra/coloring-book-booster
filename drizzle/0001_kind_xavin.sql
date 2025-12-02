CREATE TYPE "outlinefactory"."role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "outlinefactory"."subscription_tier" AS ENUM('starter', 'pro', 'max');--> statement-breakpoint
CREATE TABLE "outlinefactory"."space_images" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"name" text,
	"mime_type" text,
	"data_url" text,
	"analysis" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outlinefactory"."spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"objective" text NOT NULL,
	"theme" text,
	"constraints" text,
	"style_definition" text,
	"prompt" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "outlinefactory"."app_settings" ADD COLUMN "space_analysis_prompt" text;--> statement-breakpoint
ALTER TABLE "outlinefactory"."app_settings" ADD COLUMN "space_generation_prompt" text;--> statement-breakpoint
ALTER TABLE "outlinefactory"."app_settings" ADD COLUMN "space_standardization_prompt" text;--> statement-breakpoint
ALTER TABLE "outlinefactory"."users" ADD COLUMN "role" "outlinefactory"."role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "outlinefactory"."users" ADD COLUMN "subscription_tier" "outlinefactory"."subscription_tier" DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "outlinefactory"."users" ADD COLUMN "is_admin" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "outlinefactory"."space_images" ADD CONSTRAINT "space_images_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "outlinefactory"."spaces"("id") ON DELETE no action ON UPDATE no action;