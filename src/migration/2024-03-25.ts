import { ChannelType, Client, Events, GatewayIntentBits, OverwriteType } from 'discord.js';
import { BotSettings, SettingsFile } from '../bot/lib/settings.js';
import { connectPostgreSQL, db } from '../db/postgres.js';

// Adds indices to table.
// Updates existing project mute permissions.
console.group();

const settings = new SettingsFile<BotSettings>('customContent/settings.jsonc', 'settings.template.jsonc');

if (!process.env.TOKEN) throw 'TOKEN not set.';
if (!process.env.APPLICATION_CLIENT_ID) throw 'APPLICATION_CLIENT_ID not set.';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, async () => {
    const guild = client.guilds.cache.get(settings.data.guildID);

    if (!guild) {
        console.error('Failed to migrate: the specified guild was not found.');
        client.destroy();
        return;
    }

    await connectPostgreSQL();

    console.log('Updating project mute permissions...');

    const projectMutes: { id: string; channel_id: string; user_id: string }[] = (
        await db.query(/*sql*/ `SELECT project_mute.id, project.channel_id, project_mute.user_id FROM project, project_mute WHERE project.id = project_mute.project_id;`)
    ).rows;

    for (const projectMute of projectMutes) {
        const channel = guild.channels.cache.get(projectMute.channel_id);
        if (!channel || channel.type !== ChannelType.GuildText) {
            console.log(`Skipping ${projectMute.id} because channel does not exist...`);
            continue;
        }

        await channel.permissionOverwrites.edit(
            projectMute.user_id,
            {
                SendMessages: false,
                SendMessagesInThreads: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
            },
            { type: OverwriteType.Member, reason: 'Migrate project mute permissions.' }
        );

        console.log(`Successfully migrated project mute ${projectMute.id} (Channel ID: ${projectMute.channel_id}).`);
    }

    console.log('Indexing database tables...');

    await db.query(/*sql*/ `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_project_mute_user_id" ON "project_mute" ("user_id");`);
    console.log('Successfully created IDX_project_mute_user_id.');
    await db.query(/*sql*/ `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_warn_user_id" ON "warn" ("user_id");`);
    console.log('Successfully created IDX_warn_user_id.');
    await db.query(/*sql*/ `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_punishment_user_id" ON "punishment" ("user_id");`);
    console.log('Successfully created IDX_punishment_user_id.');
    await db.query(/*sql*/ `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_past_punishment_user_id" ON "past_punishment" ("user_id");`);
    console.log('Successfully created IDX_past_punishment_user_id.');
    await db.query(/*sql*/ `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_note_user_id" ON "note" ("user_id");`);
    console.log('Successfully created IDX_note_user_id.');
    await db.query(/*sql*/ `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_appeal_user_id" ON "appeal" ("user_id");`);
    console.log('Successfully created IDX_appeal_user_id.');

    await client.destroy();
    process.exit();
});

client.login(process.env.TOKEN);
