CREATE TABLE "campaign_details" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"campaign_id" numeric(78, 0) NOT NULL,
	"category" text,
	"story" text,
	"budget" jsonb,
	"plan" jsonb,
	"risks" text,
	"cover_key" text,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_details_chain_id_contract_address_campaign_id_pk" PRIMARY KEY("chain_id","contract_address","campaign_id"),
	CONSTRAINT "campaign_details_chain_id_positive" CHECK ("campaign_details"."chain_id" > 0),
	CONSTRAINT "campaign_details_contract_address_format" CHECK ("campaign_details"."contract_address" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "campaign_details_campaign_id_non_negative" CHECK ("campaign_details"."campaign_id" >= 0),
	CONSTRAINT "campaign_details_category_known" CHECK ("campaign_details"."category" in ('open_source', 'education', 'creative', 'apps', 'community')),
	CONSTRAINT "campaign_details_story_length" CHECK (char_length("campaign_details"."story") between 1 and 10000),
	CONSTRAINT "campaign_details_risks_length" CHECK (char_length("campaign_details"."risks") between 1 and 2000),
	CONSTRAINT "campaign_details_budget_rows" CHECK (case when "campaign_details"."budget" is null then true when jsonb_typeof("campaign_details"."budget") = 'array' then jsonb_array_length("campaign_details"."budget") between 1 and 12 else false end),
	CONSTRAINT "campaign_details_plan_steps" CHECK (case when "campaign_details"."plan" is null then true when jsonb_typeof("campaign_details"."plan") = 'array' then jsonb_array_length("campaign_details"."plan") between 1 and 12 else false end),
	CONSTRAINT "campaign_details_cover_key_format" CHECK ("campaign_details"."cover_key" ~ '^covers/[0-9a-f]{64}[.]webp$'),
	CONSTRAINT "campaign_details_updated_by_format" CHECK ("campaign_details"."updated_by" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE INDEX "campaign_details_category_idx" ON "campaign_details" USING btree ("chain_id","contract_address","category");