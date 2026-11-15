CREATE TABLE "campaign_metadata" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"campaign_id" numeric(78, 0) NOT NULL,
	"funding_mode" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "campaign_metadata_chain_id_contract_address_campaign_id_pk" PRIMARY KEY("chain_id","contract_address","campaign_id"),
	CONSTRAINT "campaign_metadata_chain_id_positive" CHECK ("campaign_metadata"."chain_id" > 0),
	CONSTRAINT "campaign_metadata_contract_address_format" CHECK ("campaign_metadata"."contract_address" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "campaign_metadata_funding_mode_known" CHECK ("campaign_metadata"."funding_mode" in ('fixed_deadline', 'open_ended')),
	CONSTRAINT "campaign_metadata_title_length" CHECK (octet_length("campaign_metadata"."title") between 1 and 100),
	CONSTRAINT "campaign_metadata_description_length" CHECK (octet_length("campaign_metadata"."description") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"campaign_id" numeric(78, 0) NOT NULL,
	"creator" text NOT NULL,
	"goal" numeric(78, 0) NOT NULL,
	"deadline" numeric(78, 0) NOT NULL,
	"total_raised" numeric(78, 0) NOT NULL,
	"cancelled" boolean NOT NULL,
	"funds_withdrawn" boolean NOT NULL,
	"created_block" bigint NOT NULL,
	"updated_block" bigint NOT NULL,
	CONSTRAINT "campaigns_chain_id_contract_address_campaign_id_pk" PRIMARY KEY("chain_id","contract_address","campaign_id"),
	CONSTRAINT "campaigns_creator_format" CHECK ("campaigns"."creator" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "campaigns_goal_positive" CHECK ("campaigns"."goal" > 0),
	CONSTRAINT "campaigns_deadline_non_negative" CHECK ("campaigns"."deadline" >= 0),
	CONSTRAINT "campaigns_total_raised_non_negative" CHECK ("campaigns"."total_raised" >= 0),
	CONSTRAINT "campaigns_updated_after_created" CHECK ("campaigns"."updated_block" >= "campaigns"."created_block")
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"campaign_id" numeric(78, 0) NOT NULL,
	"donor" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"updated_block" bigint NOT NULL,
	CONSTRAINT "contributions_chain_id_contract_address_campaign_id_donor_pk" PRIMARY KEY("chain_id","contract_address","campaign_id","donor"),
	CONSTRAINT "contributions_donor_format" CHECK ("contributions"."donor" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "contributions_amount_non_negative" CHECK ("contributions"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_metadata_fk" FOREIGN KEY ("chain_id","contract_address","campaign_id") REFERENCES "public"."campaign_metadata"("chain_id","contract_address","campaign_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_campaign_fk" FOREIGN KEY ("chain_id","contract_address","campaign_id") REFERENCES "public"."campaigns"("chain_id","contract_address","campaign_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contributions_donor_idx" ON "contributions" USING btree ("chain_id","contract_address","donor");