-- EXTENSIONS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- TABLES

DROP TABLE IF EXISTS "project";
CREATE TABLE "project" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id NUMERIC(20) UNIQUE NOT NULL,
    owners NUMERIC(20)[] NOT NULL,
    role_id NUMERIC(20) UNIQUE,
    banner_message_id TEXT,
    banner_last_timestamp TIMESTAMP WITH TIME ZONE,
    webhook_secret BYTEA UNIQUE
);

DROP TABLE IF EXISTS "project_mute";
CREATE TABLE "project_mute" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES project(id),
    user_id NUMERIC(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_project_mute_user_id";
CREATE INDEX "IDX_project_mute_user_id" ON "project_mute" USING HASH ("user_id");

DROP TABLE IF EXISTS "warn";
CREATE TABLE "warn" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20) NOT NULL,
    severity SMALLINT NOT NULL,
    reason TEXT NOT NULL,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_warn_user_id";
CREATE INDEX "IDX_warn_user_id" ON "warn" USING HASH ("user_id");

DROP TABLE IF EXISTS "ban";
CREATE TABLE "ban" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20),
    reason TEXT NOT NULL,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    expire_timestamp TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_ban_user_id";
CREATE INDEX "IDX_ban_user_id" ON "ban" USING HASH ("user_id");

DROP TABLE IF EXISTS "mute";
CREATE TABLE "mute" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20),
    reason TEXT NOT NULL,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    expire_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- NOT NULL because timeouts must expire
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_mute_user_id";
CREATE INDEX "IDX_mute_user_id" ON "mute" USING HASH ("user_id");

DROP TABLE IF EXISTS "kick";
CREATE TABLE "kick" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20),
    reason TEXT NOT NULL,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_kick_user_id";
CREATE INDEX "IDX_kick_user_id" ON "kick" USING HASH ("user_id");

DROP TABLE IF EXISTS "track";
CREATE TABLE "track" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20),
    reason TEXT NOT NULL,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_track_user_id";
CREATE INDEX "IDX_track_user_id" ON "track" USING HASH ("user_id");

DROP TABLE IF EXISTS "lifted_ban";
CREATE TABLE "lifted_ban" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20),
    reason TEXT NOT NULL,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    lifted_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    lifted_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_lifted_ban_user_id";
CREATE INDEX "IDX_lifted_ban_user_id" ON "lifted_ban" USING HASH ("user_id");

DROP TABLE IF EXISTS "lifted_mute";
CREATE TABLE "lifted_mute" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20),
    reason TEXT NOT NULL,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    lifted_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    lifted_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_lifted_mute_user_id";
CREATE INDEX "IDX_lifted_mute_user_id" ON "lifted_mute" USING HASH ("user_id");

DROP TABLE IF EXISTS "note";
CREATE TABLE "note" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20) NOT NULL,
    content TEXT,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_note_user_id";
CREATE INDEX "IDX_note_user_id" ON "note" USING HASH ("user_id");

DROP TABLE IF EXISTS "channel_lock";
CREATE TABLE "channel_lock" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id NUMERIC(20) NOT NULL,
    original_permissions SMALLINT NOT NULL, -- SMALLINT = 2 bytes, currently needs 6 bits
    expire_timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP TABLE IF EXISTS "channel_slowmode";
CREATE TABLE "channel_slowmode" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id NUMERIC(20) NOT NULL,
    original_slowmode SMALLINT NOT NULL, -- SMALLINT = 2 bytes, maximum is 6 hours (21600 seconds, maximum value is 32767)
    expire_timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP TABLE IF EXISTS "appeal";
CREATE TABLE "appeal" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    reason TEXT NOT NULL,
    result TEXT NOT NULL, -- pending, declined, accepted
    result_reason TEXT,
    result_mod_id NUMERIC(20),
    result_timestamp TIMESTAMP WITH TIME ZONE,
    result_edit_mod_id NUMERIC(20),
    result_edit_timestamp TIMESTAMP WITH TIME ZONE,
    message_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP INDEX IF EXISTS "IDX_appeal_user_id";
CREATE INDEX "IDX_appeal_user_id" ON "appeal" USING HASH ("user_id");

DROP TABLE IF EXISTS "sticky_thread";
CREATE TABLE "sticky_thread" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id NUMERIC(20) NOT NULL,
    thread_id NUMERIC(20) UNIQUE NOT NULL,
    mod_id NUMERIC(20)
);
