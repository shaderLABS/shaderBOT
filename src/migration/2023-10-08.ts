import { connectPostgreSQL, db } from './shared.ts';

// Adds a new table called 'expiring_juxtapose' to the database.
console.group();

await connectPostgreSQL();
await db.query(/*sql*/ `
    CREATE TABLE "expiring_juxtapose" (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        juxtapose_id UUID NOT NULL,
        channel_id NUMERIC(20) NOT NULL,
        message_id NUMERIC(20) NOT NULL,
        expire_timestamp TIMESTAMP WITH TIME ZONE NOT NULL
    );`);

console.log("Successfully added 'expiring_juxtapose' table.");

process.exit();
