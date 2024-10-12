-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations

CREATE TABLE IF NOT EXISTS "mute" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0),
	"reason" text NOT NULL,
	"context_url" text,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"expire_timestamp" timestamp with time zone NOT NULL,
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kick" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0),
	"reason" text NOT NULL,
	"context_url" text,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "track" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0),
	"reason" text NOT NULL,
	"context_url" text,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channel_lock" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"channel_id" numeric(20, 0) NOT NULL,
	"original_permissions" smallint NOT NULL,
	"expire_timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channel_slowmode" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"channel_id" numeric(20, 0) NOT NULL,
	"original_slowmode" smallint NOT NULL,
	"expire_timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ban" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0),
	"reason" text NOT NULL,
	"context_url" text,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"expire_timestamp" timestamp with time zone,
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lifted_mute" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0),
	"reason" text NOT NULL,
	"context_url" text,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"lifted_timestamp" timestamp with time zone NOT NULL,
	"lifted_mod_id" numeric(20, 0),
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "note" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0) NOT NULL,
	"content" text,
	"context_url" text,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lifted_ban" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0),
	"reason" text NOT NULL,
	"context_url" text,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"lifted_timestamp" timestamp with time zone NOT NULL,
	"lifted_mod_id" numeric(20, 0),
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appeal" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"reason" text NOT NULL,
	"result" text NOT NULL,
	"result_reason" text,
	"result_mod_id" numeric(20, 0),
	"result_timestamp" timestamp with time zone,
	"result_edit_mod_id" numeric(20, 0),
	"result_edit_timestamp" timestamp with time zone,
	"message_id" numeric(20, 0),
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"channel_id" numeric(20, 0) NOT NULL,
	"owners" numeric(20, 0)[] NOT NULL,
	"role_id" numeric(20, 0),
	"banner_message_id" text,
	"banner_last_timestamp" timestamp with time zone,
	"webhook_secret" "bytea",
	CONSTRAINT "project_channel_id_key" UNIQUE("channel_id"),
	CONSTRAINT "project_role_id_key" UNIQUE("role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_mute" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warn" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0) NOT NULL,
	"severity" smallint NOT NULL,
	"reason" text NOT NULL,
	"edited_timestamp" timestamp with time zone,
	"edited_mod_id" numeric(20, 0),
	"timestamp" timestamp with time zone NOT NULL,
	"context_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sticky_thread" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"channel_id" numeric(20, 0) NOT NULL,
	"thread_id" numeric(20, 0) NOT NULL,
	"mod_id" numeric(20, 0),
	CONSTRAINT "sticky_thread_thread_id_key" UNIQUE("thread_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_mute" ADD CONSTRAINT "project_mute_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_mute_user_id" ON "mute" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_kick_user_id" ON "kick" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_track_user_id" ON "track" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_ban_user_id" ON "ban" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_lifted_mute_user_id" ON "lifted_mute" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_note_user_id" ON "note" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_lifted_ban_user_id" ON "lifted_ban" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_appeal_user_id" ON "appeal" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_project_mute_user_id" ON "project_mute" USING hash ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_warn_user_id" ON "warn" USING hash ("user_id");
