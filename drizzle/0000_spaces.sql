CREATE TABLE IF NOT EXISTS "spaces" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "space_images" (
    "id" text PRIMARY KEY,
    "space_id" text NOT NULL,
    "image_url" text NOT NULL,
    "prompt" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "space_images_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE
);
