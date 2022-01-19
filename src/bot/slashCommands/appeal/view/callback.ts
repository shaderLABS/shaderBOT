import { MessageEmbed, Util } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../../db/postgres.js';
import { client } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { embedColor, embedIcon, replyError } from '../../../lib/embeds.js';
import { parseUser } from '../../../lib/misc.js';
import { formatTimeDate } from '../../../lib/time.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        const appeal = (
            await db.query(
                /*sql*/ `
                    SELECT *
                    FROM appeal
                    WHERE id = $1;`,
                [id]
            )
        ).rows[0];

        if (!appeal) return replyError(interaction, 'There is no ban appeal with the specified UUID.');

        const targetUser = await client.users.fetch(appeal.user_id).catch(() => undefined);
        if (!targetUser) return replyError(interaction, 'The user who sent the ban appeal could not be resolved.');

        const resultEmbed = new MessageEmbed({
            author: {
                name: 'Pending...',
                iconURL: embedIcon.info,
            },
            color: embedColor.blue,
        });

        if (appeal.result_mod_id) {
            resultEmbed.setTimestamp(appeal.result_timestamp);
            resultEmbed.setDescription(
                `**Moderator:** ${parseUser(appeal.result_mod_id)}\n\n${Util.escapeMarkdown(appeal.result_reason || 'No reason provided.')}\n\n${
                    appeal.result_edit_mod_id ? `*(last edited by ${parseUser(appeal.result_edit_mod_id)} at ${formatTimeDate(new Date(appeal.result_edit_timestamp))})*` : ''
                }`
            );

            if (appeal.result === 'declined') {
                resultEmbed.setAuthor({
                    name: 'Declined',
                    iconURL: embedIcon.error,
                });
                resultEmbed.setColor(embedColor.red);
            } else {
                resultEmbed.setAuthor({
                    name: 'Accepted',
                    iconURL: embedIcon.success,
                });
                resultEmbed.setColor(embedColor.green);
            }
        }

        interaction.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: targetUser.tag,
                        iconURL: targetUser.displayAvatarURL(),
                    },
                    title: 'Ban Appeal',
                    color: embedColor.blue,
                    description: `**User ID:** ${targetUser.id}\n\n${Util.escapeMarkdown(appeal.reason)}`,
                    timestamp: appeal.timestamp,
                    footer: {
                        text: 'ID: ' + id,
                    },
                }),
                resultEmbed,
            ],
        });
    },
};
