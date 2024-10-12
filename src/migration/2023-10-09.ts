import { AttachmentBuilder, Client, EmbedBuilder, Events, GatewayIntentBits } from 'discord.js';
import { EmbedColor, EmbedIcon } from '../bot/lib/embeds.ts';
import { SettingsFile, type BotSettings } from '../bot/lib/settings.ts';
import { connectPostgreSQL, db } from './shared.ts';

// Renames the column `banner_url` to `banner_message_id` in the `project` table.
// Updates existing project banner URLs to message IDs by sending a migration message.
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
    await db.query(/*sql*/ `ALTER TABLE project RENAME COLUMN banner_url TO banner_message_id;`).catch(() => {
        console.log('Failed to migrate database table. Assuming that it has already been migrated...');
    });

    const projectBanners: { id: string; channel_id: string; banner_message_id: string }[] = (
        await db.query(/*sql*/ `SELECT id, channel_id, banner_message_id FROM project WHERE banner_message_id IS NOT NULL;`)
    ).rows;

    for (const projectBanner of projectBanners) {
        if (!URL.canParse(projectBanner.banner_message_id)) {
            console.log(`Skipping ${projectBanner.id}...`);
            continue;
        }

        const channel = guild.channels.cache.get(projectBanner.channel_id);
        if (!channel?.isTextBased()) {
            console.log(`Skipping ${projectBanner.id} because channel does not exist...`);
            continue;
        }

        const updateMessage = await channel.send({
            embeds: [
                new EmbedBuilder({
                    color: EmbedColor.Blue,
                    author: {
                        iconURL: EmbedIcon.Info,
                        name: 'Project Banner CDN Migration',
                    },
                    description:
                        'Discord is planning on making changes that are supposed to prevent abuse of their CDN. Unfortunately, these changes interfere with the way that project banners have been stored, making re-uploading this image here necessary.',
                    image: { url: 'attachment://banner.png' },
                    footer: {
                        text: 'Do not delete this message.',
                    },
                }),
            ],
            files: [new AttachmentBuilder(projectBanner.banner_message_id, { name: 'banner.png' })],
        });

        console.log(`Successfully migrated ${projectBanner.id} (Message ID: ${updateMessage.id})...`);

        await db.query({
            text: /*sql*/ `
                UPDATE project
                SET banner_message_id = $1
                WHERE id = $2;`,
            values: [updateMessage.id, projectBanner.id],
        });
    }

    await client.destroy();
    process.exit();
});

client.login(process.env.TOKEN);
