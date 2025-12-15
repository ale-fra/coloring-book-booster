CREATE TABLE "outlinefactory"."ai_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"provider" text NOT NULL,
	"model" text,
	"input" text,
	"output" text,
	"status" text,
	"duration_ms" integer,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "outlinefactory"."system_configs" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"group" text
);
--> statement-breakpoint
DROP TABLE "outlinefactory"."app_settings" CASCADE;