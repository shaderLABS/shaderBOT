import { Permissions } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyButtonPages, replyError, replyInfo, replySuccess, sendButtonPages } from '../../../lib/embeds.js';
import { formatContextURL, parseUser } from '../../../lib/misc.js';
import { formatTimeDate } from '../../../lib/time.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', false) || interaction.user;
        const isSelfTarget = targetUser.id === interaction.user.id;

        if (!isSelfTarget && !member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) return replyError(interaction, 'You do not have permission to view the warnings of other users.');

        const warnings = await db.query(
            /*sql*/ `
            SELECT id::TEXT, reason, context_url, severity, mod_id::TEXT, timestamp, edited_timestamp::TEXT, edited_mod_id::TEXT
            FROM warn
            WHERE user_id = $1
            ORDER BY timestamp DESC;`,
            [targetUser.id]
        );

        if (warnings.rowCount === 0) return replyInfo(interaction, `${isSelfTarget ? 'You do' : '<@' + targetUser.id + '> does'} not have any warnings.`);

        const pages: string[] = [];
        warnings.rows.reduce((prev, curr, i, { length }) => {
            const page =
                `**User:** ${parseUser(targetUser)}` +
                `\n**Severity:** ${curr.severity}` +
                `\n**Reason:** ${curr.reason || 'No reason provided.'}` +
                `\n**Moderator:** ${parseUser(curr.mod_id)}` +
                `\n**Context:** ${formatContextURL(curr.context_url)}` +
                `\n**ID:** ${curr.id}` +
                `\n**Created At:** ${formatTimeDate(new Date(curr.timestamp))}` +
                (curr.edited_timestamp ? `\n*(last edited by ${parseUser(curr.edited_mod_id)} at ${formatTimeDate(new Date(curr.edited_timestamp))})*` : '');

            if ((i + 1) % 3 === 0 || i === length - 1) {
                pages.push(prev + '\n\n' + page);
                return '';
            }

            return prev + '\n\n' + page;
        }, '');

        if (isSelfTarget) {
            // DM
            try {
                const dmChannel = await member.createDM();
                sendButtonPages(dmChannel, member.user, pages, 'Warnings');

                replySuccess(interaction, 'Successfully sent you your warnings in a DM.', 'List Warnings');
            } catch {
                replyError(interaction, "Failed to send you a DM. Please make sure that they're open and try again.");
            }
        } else {
            // public
            replyButtonPages(interaction, pages, 'Warnings');
        }
    },
};
