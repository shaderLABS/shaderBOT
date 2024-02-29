import { connectPostgreSQL, db } from '../db/postgres.ts';

// Adds a new table called 'track' to the database.
console.group();

await connectPostgreSQL();
await db.query(/*sql*/ `
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
    CREATE INDEX "IDX_track_user_id" ON "track" USING HASH ("user_id");`);

console.log("Successfully added 'track' table.");

process.exit();
