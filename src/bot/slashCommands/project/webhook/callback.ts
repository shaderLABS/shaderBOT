import crypto from 'crypto';
import { ChannelType, EmbedBuilder } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { EmbedColor, EmbedIcon, replyError } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { isProjectOwner } from '../../../lib/project.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;

        if (channel.type !== ChannelType.GuildText) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const secret = crypto.randomBytes(32);
        const endpoint = `https://${process.env.DOMAIN || 'localhost'}/api/webhook/release/${channel.id}`;

        await db.query(/*sql*/ `UPDATE project SET webhook_secret = $1 WHERE channel_id = $2;`, [secret, channel.id]);

        // don't use helper function, must stay ephemeral
        interaction.reply({
            embeds: [
                new EmbedBuilder({
                    description: `**Secret Key**\n\`${secret.toString(
                        'hex'
                    )}\`\n**Release Endpoint**\n\`${endpoint}\`\n\nDO NOT SHARE THIS KEY WITH ANYONE! YOU CAN REGENERATE IT AND INVALIDATE THE OLD ONE BY RUNNING THIS COMMAND AGAIN.`,
                    author: {
                        name: 'Project Webhook',
                        iconURL: EmbedIcon.success,
                    },
                    color: EmbedColor.green,
                }),
            ],
            ephemeral: true,
        });

        log(`${parseUser(user)} (re)generated the webhook secret key for their project <#${channel.id}>.`, 'Project Webhook');
    },
};
