import { MessageEmbed } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import automaticPunishment from '../../../lib/automaticPunishment.js';
import { embedColor, replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { formatContextURL, parseUser, userToMember } from '../../../lib/misc.js';
import { getContextURL } from '../../../lib/searchMessage.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        const severity = interaction.options.getInteger('severity', true);
        const reason = interaction.options.getString('reason', false);
        if (reason && reason.length > 500) return replyError(interaction, 'The reason must not be more than 500 characters long.');

        const targetMember = await userToMember(interaction.guild, targetUser.id);

        if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return replyError(interaction, "You can't warn a user with a role higher than or equal to yours.", 'Insufficient Permissions');

        const contextURL = await getContextURL(interaction);
        if (!contextURL) return;

        const id = (
            await db.query(
                /*sql*/ `
                INSERT INTO warn (user_id, mod_id, reason, context_url, severity, timestamp)
                VALUES ($1, $2, $3, $4, $5::SMALLINT, $6)
                RETURNING id;`,
                [targetUser.id, member.id, reason, contextURL, severity, new Date()]
            )
        ).rows[0].id;

        let content =
            `**User:** ${parseUser(targetUser)}` +
            `\n**Severity:** ${severity}` +
            `\n**Reason:** ${reason || 'No reason provided.'}` +
            `\n**Moderator:** ${parseUser(member.user)}` +
            `\n**Context:** ${formatContextURL(contextURL)}` +
            `\n**ID:** ${id}`;

        await targetUser.send({ embeds: [new MessageEmbed({ author: { name: 'You have been warned in shaderLABS.' }, description: content, color: embedColor.blue })] }).catch(() => {
            content += '\n\n*The target could not be DMed.*';
        });

        replySuccess(interaction, content, 'Create Warning');
        log(content, 'Create Warning');

        await automaticPunishment(targetUser, targetMember);
    },
};
