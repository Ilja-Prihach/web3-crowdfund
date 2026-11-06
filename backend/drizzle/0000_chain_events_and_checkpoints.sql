CREATE TABLE "chain_events" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"block_number" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"event_name" text NOT NULL,
	"campaign_id" numeric(78, 0) NOT NULL,
	"args" jsonb NOT NULL,
	CONSTRAINT "chain_events_chain_id_tx_hash_log_index_pk" PRIMARY KEY("chain_id","tx_hash","log_index"),
	CONSTRAINT "chain_events_chain_id_positive" CHECK ("chain_events"."chain_id" > 0),
	CONSTRAINT "chain_events_contract_address_format" CHECK ("chain_events"."contract_address" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chain_events_tx_hash_format" CHECK ("chain_events"."tx_hash" ~ '^0x[0-9a-f]{64}$'),
	CONSTRAINT "chain_events_log_index_non_negative" CHECK ("chain_events"."log_index" >= 0),
	CONSTRAINT "chain_events_event_name_known" CHECK ("chain_events"."event_name" in ('CampaignCreated', 'CampaignDeadlineUpdated', 'DonationMade', 'CampaignCancelled', 'RefundClaimed', 'FundsWithdrawn'))
);
--> statement-breakpoint
CREATE TABLE "indexer_checkpoints" (
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"last_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indexer_checkpoints_chain_id_contract_address_pk" PRIMARY KEY("chain_id","contract_address"),
	CONSTRAINT "indexer_checkpoints_chain_id_positive" CHECK ("indexer_checkpoints"."chain_id" > 0),
	CONSTRAINT "indexer_checkpoints_contract_address_format" CHECK ("indexer_checkpoints"."contract_address" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "indexer_checkpoints_last_block_non_negative" CHECK ("indexer_checkpoints"."last_block" >= 0)
);
--> statement-breakpoint
CREATE INDEX "chain_events_replay_idx" ON "chain_events" USING btree ("chain_id","contract_address","block_number","log_index");