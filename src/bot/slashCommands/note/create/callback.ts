import { MessageEmbed } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { embedIcon, replyError } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { formatContextURL, parseUser } from '../../../lib/misc.js';
import { getContextURL } from '../../../lib/searchMessage.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        const content = interaction.options.getString('content', true);
        if (content.length > 500) return replyError(interaction, 'The content must not be more than 500 characters long.');

        const contextURL = await getContextURL(interaction.channel);
        const timestamp = new Date();

        const id = (
            await db.query(
                /*sql*/ `
                INSERT INTO note (user_id, mod_id, content, context_url, timestamp)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;`,
                [targetUser.id, member.id, content, contextURL, timestamp]
            )
        ).rows[0].id;

        const messageContent = `**User:** ${parseUser(targetUser)}` + `\n**Content:** ${content}` + `\n**Moderator:** ${parseUser(member.user)}` + `\n**Context:** ${formatContextURL(contextURL)}`;

        interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setAuthor('Add Note', embedIcon.note)
                    .setColor('#ffc107')
                    .setDescription(messageContent)
                    .setFooter('ID: ' + id),
            ],
        });

        log(`${messageContent}\n**ID:** ${id}`, 'Add Note');
    },
};
