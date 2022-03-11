import { Collection, MessageAttachment } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { ensureTextChannel, isValidUrl, parseUser } from '../../../lib/misc.js';
import { isProjectOwner } from '../../../lib/project.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;
        if (!ensureTextChannel(channel, interaction)) return;

        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        let banner = interaction.options.getString('value', false);

        if (banner) {
            if (!isValidUrl(banner)) return replyError(interaction, 'The specified URL is invalid.');

            try {
                const reply = await channel.send({
                    files: [new MessageAttachment(banner)],
                });

                if (reply.attachments instanceof Collection) {
                    const cachedAttachment = reply.attachments.first();
                    if (!cachedAttachment?.contentType || !['image/jpeg', 'image/png', 'image/webp'].includes(cachedAttachment.contentType)) {
                        return replyError(interaction, 'Unsupported file type. You must use PNG, JPEG or WebP images.', undefined, false);
                    }

                    banner = cachedAttachment.url;
                }
            } catch {
                return replyError(interaction, 'Failed to cache the banner image. Is it larger than the maximum file size?');
            }

            replySuccess(interaction, 'Successfully set the banner image.');
            log(`${parseUser(interaction.user)} set the banner image of their project <#${channel.id}> to: ${banner}`);
        } else {
            replySuccess(interaction, 'Successfully removed the banner image.');
            log(`${parseUser(interaction.user)} removed the banner image from their project <#${channel.id}>.`);
        }

        await db.query(/*sql*/ `UPDATE project SET banner_url = $1 WHERE channel_id = $2;`, [banner, channel.id]);
    },
};
