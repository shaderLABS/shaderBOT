import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { db, DB_DRIZZLE_OUTPUT } from './db/postgres.ts';
import { Project } from './bot/lib/project.ts';

if (!process.env.TOKEN) throw 'TOKEN not set.';
if (!process.env.APPLICATION_CLIENT_ID) throw 'APPLICATION_CLIENT_ID not set.';

console.log('Migrating database...');
await migrate(db, { migrationsFolder: DB_DRIZZLE_OUTPUT });

export const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async () => {
    for (const project of await Project.getAllUnarchived()) {
        const channel = project.getChannel();
        console.log(`Applying permissions for project channel ${channel.toString()} (${project.channelId}, ${project.id})...`);

        for (const ownerId of project.ownerIds) {
            await project.applyPermissions(ownerId, channel);
        }
    }

    console.log('Added new permissions to all project channels!');
    client.destroy();
});

client.login(process.env.TOKEN);
