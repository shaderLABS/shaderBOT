import { connectPostgreSQL, db } from '../db/postgres.js';

console.group();

await connectPostgreSQL();

if ((await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'ban';`)).rowCount === 0) {
    await db.query(/*sql*/ `
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

        CREATE INDEX "IDX_ban_user_id" ON "ban" USING HASH ("user_id");

        INSERT INTO "ban" (id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, expire_timestamp, timestamp)
        SELECT id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, expire_timestamp, timestamp FROM "punishment"
        WHERE "type" = 'ban';
    `);

    console.log('Successfully migrated bans.');
} else {
    console.log('Bans have already been migrated.');
}

if ((await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'mute';`)).rowCount === 0) {
    await db.query(/*sql*/ `
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

        CREATE INDEX "IDX_mute_user_id" ON "mute" USING HASH ("user_id");

        INSERT INTO "mute" (id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, expire_timestamp, timestamp)
        SELECT id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, expire_timestamp, timestamp FROM "punishment"
        WHERE "type" = 'mute';
    `);

    console.log('Successfully migrated mutes.');
} else {
    console.log('Mutes have already been migrated.');
}

if ((await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'kick';`)).rowCount === 0) {
    await db.query(/*sql*/ `
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

        CREATE INDEX "IDX_kick_user_id" ON "kick" USING HASH ("user_id");

        INSERT INTO "kick" (id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, timestamp)
        SELECT id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, timestamp FROM "past_punishment"
        WHERE "type" = 'kick';
    `);

    console.log('Successfully migrated kicks.');
} else {
    console.log('Kicks have already been migrated.');
}

if ((await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'lifted_ban';`)).rowCount === 0) {
    await db.query(/*sql*/ `
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

        CREATE INDEX "IDX_lifted_ban_user_id" ON "lifted_ban" USING HASH ("user_id");

        INSERT INTO "lifted_ban" (id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
        SELECT id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp FROM "past_punishment"
        WHERE "type" = 'ban';
    `);

    console.log('Successfully migrated lifted bans.');
} else {
    console.log('Lifted bans have already been migrated.');
}

if ((await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'lifted_mute';`)).rowCount === 0) {
    await db.query(/*sql*/ `
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

        CREATE INDEX "IDX_lifted_mute_user_id" ON "lifted_mute" USING HASH ("user_id");

        INSERT INTO "lifted_mute" (id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
        SELECT id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp FROM "past_punishment"
        WHERE "type" = 'mute';
    `);

    console.log('Successfully migrated lifted mutes.');
} else {
    console.log('Lifted mutes have already been migrated.');
}

if ((await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_lock';`)).rowCount === 0) {
    await db.query(/*sql*/ `
        CREATE TABLE "channel_lock" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            channel_id NUMERIC(20) NOT NULL,
            original_permissions SMALLINT NOT NULL, -- SMALLINT = 2 bytes, currently needs 6 bits
            expire_timestamp TIMESTAMP WITH TIME ZONE NOT NULL
        );

        INSERT INTO "channel_lock" (id, channel_id, original_permissions, expire_timestamp)
        SELECT id, channel_id, previous_state, expire_timestamp FROM "lock_slowmode"
        WHERE "type" = 'lock';
    `);

    console.log('Successfully migrated channel locks.');
} else {
    console.log('Channel locks have already been migrated.');
}

if ((await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_slowmode';`)).rowCount === 0) {
    await db.query(/*sql*/ `
        CREATE TABLE "channel_slowmode" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            channel_id NUMERIC(20) NOT NULL,
            original_slowmode SMALLINT NOT NULL, -- SMALLINT = 2 bytes, maximum is 6 hours (21600 seconds, maximum value is 32767)
            expire_timestamp TIMESTAMP WITH TIME ZONE NOT NULL
        );

        INSERT INTO "channel_slowmode" (id, channel_id, original_slowmode, expire_timestamp)
        SELECT id, channel_id, previous_state, expire_timestamp FROM "lock_slowmode"
        WHERE "type" = 'slowmode';
    `);

    console.log('Successfully migrated channel slowmodes.');
} else {
    console.log('Channel slowmodes have already been migrated.');
}

console.log("Please confirm that all data was migrated. After that, you can delete the 'punishment', 'past_punishment' and 'lock_slowmode' tables.");

process.exit();
