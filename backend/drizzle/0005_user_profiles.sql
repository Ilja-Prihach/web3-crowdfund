CREATE TABLE "profiles" (
	"address" text PRIMARY KEY NOT NULL,
	"name" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_address_format" CHECK ("profiles"."address" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "profiles_name_length" CHECK ("profiles"."name" is null or (length(trim("profiles"."name")) > 0 and length("profiles"."name") <= 80)),
	CONSTRAINT "profiles_bio_length" CHECK ("profiles"."bio" is null or (length(trim("profiles"."bio")) > 0 and length("profiles"."bio") <= 1000))
);
