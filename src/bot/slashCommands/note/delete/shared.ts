import { MessageEmbed } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { embedIcon } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { formatContextURL, parseUser } from '../../../lib/misc.js';
import { formatTimeDate } from '../../../lib/time.js';

export async function deleteNote(interaction: GuildCommandInteraction, note: any) {
    await db.query(/*sql*/ `DELETE FROM note WHERE id = $1;`, [note.id]);

    let messageContent =
        `**User:** ${parseUser(note.user_id)}` +
        `\n**Content:** ${note.content}` +
        `\n**Moderator:** ${parseUser(note.mod_id)}` +
        `\n**Context:** ${formatContextURL(note.context_url)}` +
        `\n**Created At:** ${formatTimeDate(new Date(note.timestamp))}`;

    if (note.edited_timestamp) messageContent += `\n*(last edited by ${parseUser(note.edited_mod_id)} at ${formatTimeDate(new Date(note.edited_timestamp))})*`;

    interaction.reply({
        embeds: [
            new MessageEmbed()
                .setAuthor('Delete Note', embedIcon.note)
                .setColor('#ffc107')
                .setDescription(messageContent)
                .setFooter('ID: ' + note.id),
        ],
    });

    log(`${messageContent}\n**ID:** ${note.id}`, 'Delete Note');
}
