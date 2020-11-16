-- EXTENSIONS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- TABLES

DROP TABLE IF EXISTS "project";
CREATE TABLE "project" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id NUMERIC(20) UNIQUE NOT NULL,
    owners NUMERIC(20)[] NOT NULL,
    role_id NUMERIC(20) UNIQUE NOT NULL
);

DROP TABLE IF EXISTS "ticket";
CREATE TABLE "ticket" (            
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT UNIQUE NOT NULL,
    project_channel_id NUMERIC(20) NOT NULL REFERENCES project(channel_id),
    description TEXT,
    attachments TEXT[],
    author_id NUMERIC(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    edited TIMESTAMP WITH TIME ZONE,
    closed BOOLEAN DEFAULT FALSE,
    channel_id NUMERIC(20) UNIQUE,
    subscription_message_id NUMERIC(20) UNIQUE
);

DROP TABLE IF EXISTS "comment";
CREATE TABLE "comment" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES ticket(id),
    author_id NUMERIC(20) NOT NULL,
    message_id NUMERIC(20) UNIQUE,
    content TEXT,
    attachments TEXT[],
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    edited TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "warn";
CREATE TABLE "warn" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    mod_id NUMERIC(20) NOT NULL,
    severity SMALLINT NOT NULL,
    reason TEXT,
    expired BOOLEAN NOT NULL DEFAULT FALSE,
    expire_days SMALLINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP TABLE IF EXISTS "punishment";
CREATE TABLE "punishment" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    type TEXT NOT NULL, -- ban, tban, mute
    mod_id NUMERIC(20),
    reason TEXT,
    expire_timestamp TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

DROP TABLE IF EXISTS "past_punishment";
CREATE TABLE "past_punishment" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) NOT NULL,
    type TEXT NOT NULL, -- ban, tban, mute
    mod_id NUMERIC(20),
    reason TEXT,
    lifted_timestamp TIMESTAMP WITH TIME ZONE,
    lifted_mod_id NUMERIC(20),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- FUNCTIONS

DROP FUNCTION IF EXISTS "expire_warns";
CREATE FUNCTION expire_warns() RETURNS VOID AS $$
	BEGIN
		UPDATE warn SET expired = TRUE WHERE expired = FALSE AND (timestamp + INTERVAL '1 day' * expire_days) < (NOW() + INTERVAL '10 minutes');
	END;
$$ LANGUAGE plpgsql;

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