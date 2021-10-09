import { MessageEmbed } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { embedIcon, replyError } from '../../../lib/embeds.js';
import { formatContextURL, parseUser } from '../../../lib/misc.js';
import { formatTimeDate } from '../../../lib/time.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        const note = (await db.query(/*sql*/ `SELECT * FROM note WHERE id = $1;`, [id])).rows[0];
        if (!note) return replyError(interaction, 'There is no note with the specified UUID.');

        const messageContent =
            `**User:** ${parseUser(note.user_id)}` +
            `\n**Content:** ${note.content}` +
            `\n**Moderator:** ${parseUser(note.mod_id)}` +
            `\n**Context:** ${formatContextURL(note.context_url)}` +
            `\n**Created At:** ${formatTimeDate(new Date(note.timestamp))}` +
            (note.edited_timestamp ? `\n*(last edited by ${parseUser(note.edited_mod_id)} at ${formatTimeDate(new Date(note.edited_timestamp))})*` : '');

        interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setAuthor('Note', embedIcon.note)
                    .setColor('#ffc107')
                    .setDescription(messageContent)
                    .setFooter('ID: ' + note.id),
            ],
        });
    },
};
