-- EXTENSIONS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- TABLES

DROP TABLE IF EXISTS "project";
CREATE TABLE "project" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id NUMERIC(20) UNIQUE NOT NULL,
    owners NUMERIC(20)[] NOT NULL,
    role_id NUMERIC(20) UNIQUE NOT NULL,
    issue_tracker_url TEXT
);

DROP TABLE IF EXISTS "warn";
CREATE TABLE "warn" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20) NOT NULL,
    severity SMALLINT NOT NULL,
    reason TEXT,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP TABLE IF EXISTS "punishment";
CREATE TABLE "punishment" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    type TEXT NOT NULL, -- ban, mute, kick
    mod_id NUMERIC(20),
    reason TEXT,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    expire_timestamp TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP TABLE IF EXISTS "past_punishment";
CREATE TABLE "past_punishment" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    type TEXT NOT NULL, -- ban, mute, kick
    mod_id NUMERIC(20),
    reason TEXT,
    context_url TEXT,
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    edited_mod_id NUMERIC(20),
    lifted_timestamp TIMESTAMP WITH TIME ZONE,
    lifted_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

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

-- SESSION

DROP TABLE IF EXISTS "session";
CREATE TABLE "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");