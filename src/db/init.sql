CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DROP TABLE IF EXISTS "ticket";
CREATE TABLE "ticket" (            
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT UNIQUE NOT NULL,
    project_channel_id NUMERIC(20) NOT NULL,
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
    ticket_id UUID NOT NULL,
    author_id NUMERIC(20) NOT NULL,
    message_id NUMERIC(20) UNIQUE,
    content TEXT,
    attachments TEXT[],
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    edited TIMESTAMP WITH TIME ZONE
);

DROP TABLE IF EXISTS "project";
CREATE TABLE "project" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id NUMERIC(20) UNIQUE NOT NULL,
    owners NUMERIC(20)[] NOT NULL,
    role_id NUMERIC(20) UNIQUE NOT NULL
);

DROP TABLE IF EXISTS "user";
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id NUMERIC(20) UNIQUE NOT NULL,
    username VARCHAR(32) NOT NULL,
    discriminator SMALLINT NOT NULL,
    avatar TEXT NOT NULL,
    role_ids NUMERIC(20)[] NOT NULL
);

DROP TABLE IF EXISTS "session";
CREATE TABLE "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");