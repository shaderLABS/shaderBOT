ALTER TABLE "appeal" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "appeal" RENAME COLUMN "result_reason" TO "resultReason";--> statement-breakpoint
ALTER TABLE "appeal" RENAME COLUMN "result_mod_id" TO "resultModeratorId";--> statement-breakpoint
ALTER TABLE "appeal" RENAME COLUMN "result_timestamp" TO "resultTimestamp";--> statement-breakpoint
ALTER TABLE "appeal" RENAME COLUMN "result_edit_mod_id" TO "resultEditModeratorId";--> statement-breakpoint
ALTER TABLE "appeal" RENAME COLUMN "result_edit_timestamp" TO "resultEditTimestamp";--> statement-breakpoint
ALTER TABLE "appeal" RENAME COLUMN "message_id" TO "messageId";--> statement-breakpoint
ALTER TABLE "ban" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "ban" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "ban" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "ban" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "ban" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "ban" RENAME COLUMN "expire_timestamp" TO "expireTimestamp";--> statement-breakpoint
ALTER TABLE "channel_lock" RENAME COLUMN "channel_id" TO "channelId";--> statement-breakpoint
ALTER TABLE "channel_lock" RENAME COLUMN "original_permissions" TO "originalPermissions";--> statement-breakpoint
ALTER TABLE "channel_lock" RENAME COLUMN "expire_timestamp" TO "expireTimestamp";--> statement-breakpoint
ALTER TABLE "channel_slowmode" RENAME COLUMN "channel_id" TO "channelId";--> statement-breakpoint
ALTER TABLE "channel_slowmode" RENAME COLUMN "original_slowmode" TO "originalSlowmode";--> statement-breakpoint
ALTER TABLE "channel_slowmode" RENAME COLUMN "expire_timestamp" TO "expireTimestamp";--> statement-breakpoint
ALTER TABLE "kick" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "kick" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "kick" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "kick" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "kick" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "lifted_ban" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "lifted_ban" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "lifted_ban" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "lifted_ban" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "lifted_ban" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "lifted_ban" RENAME COLUMN "lifted_timestamp" TO "liftedTimestamp";--> statement-breakpoint
ALTER TABLE "lifted_ban" RENAME COLUMN "lifted_mod_id" TO "liftedModeratorId";--> statement-breakpoint
ALTER TABLE "lifted_mute" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "lifted_mute" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "lifted_mute" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "lifted_mute" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "lifted_mute" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "lifted_mute" RENAME COLUMN "lifted_timestamp" TO "liftedTimestamp";--> statement-breakpoint
ALTER TABLE "lifted_mute" RENAME COLUMN "lifted_mod_id" TO "liftedModeratorId";--> statement-breakpoint
ALTER TABLE "mute" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "mute" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "mute" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "mute" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "mute" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "mute" RENAME COLUMN "expire_timestamp" TO "expireTimestamp";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "note" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "project" RENAME COLUMN "channel_id" TO "channelId";--> statement-breakpoint
ALTER TABLE "project" RENAME COLUMN "owners" TO "ownerIds";--> statement-breakpoint
ALTER TABLE "project" RENAME COLUMN "role_id" TO "roleId";--> statement-breakpoint
ALTER TABLE "project" RENAME COLUMN "banner_message_id" TO "bannerMessageId";--> statement-breakpoint
ALTER TABLE "project" RENAME COLUMN "banner_last_timestamp" TO "bannerLastTimestamp";--> statement-breakpoint
ALTER TABLE "project_mute" RENAME COLUMN "project_id" TO "projectId";--> statement-breakpoint
ALTER TABLE "project_mute" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "sticky_thread" RENAME COLUMN "channel_id" TO "channelId";--> statement-breakpoint
ALTER TABLE "sticky_thread" RENAME COLUMN "thread_id" TO "threadId";--> statement-breakpoint
ALTER TABLE "sticky_thread" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "track" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "track" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "track" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "track" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "track" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "warn" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "warn" RENAME COLUMN "mod_id" TO "moderatorId";--> statement-breakpoint
ALTER TABLE "warn" RENAME COLUMN "edited_timestamp" TO "editTimestamp";--> statement-breakpoint
ALTER TABLE "warn" RENAME COLUMN "edited_mod_id" TO "editModeratorId";--> statement-breakpoint
ALTER TABLE "warn" RENAME COLUMN "context_url" TO "contextUrl";--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_channel_id_key";--> statement-breakpoint
ALTER TABLE "project" DROP CONSTRAINT "project_role_id_key";--> statement-breakpoint
ALTER TABLE "sticky_thread" DROP CONSTRAINT "sticky_thread_thread_id_key";--> statement-breakpoint
ALTER TABLE "project_mute" DROP CONSTRAINT "project_mute_project_id_fkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_appeal_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_ban_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_kick_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_lifted_ban_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_lifted_mute_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_mute_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_note_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_project_mute_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_track_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_warn_user_id";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_mute" ADD CONSTRAINT "project_mute_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appeal_userId_index" ON "appeal" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ban_userId_index" ON "ban" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kick_userId_index" ON "kick" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lifted_ban_userId_index" ON "lifted_ban" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lifted_mute_userId_index" ON "lifted_mute" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mute_userId_index" ON "mute" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_userId_index" ON "note" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_mute_userId_index" ON "project_mute" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "track_userId_index" ON "track" USING hash ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warn_userId_index" ON "warn" USING hash ("userId");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_channelId_unique" UNIQUE("channelId");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_roleId_unique" UNIQUE("roleId");--> statement-breakpoint
ALTER TABLE "sticky_thread" ADD CONSTRAINT "sticky_thread_threadId_unique" UNIQUE("threadId");
