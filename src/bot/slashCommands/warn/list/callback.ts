import { PermissionFlagsBits } from 'discord.js';
import { replyButtonPages, replyError, replyInfo, replySuccess, sendButtonPages } from '../../../lib/embeds.js';
import { Warning } from '../../../lib/warning.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', false) || interaction.user;
        const isSelfTarget = targetUser.id === interaction.user.id;

        if (!isSelfTarget && !member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return replyError(interaction, 'You do not have permission to view the warnings of other users.');
        }

        const warnings = await Warning.getAllByUserID(targetUser.id);

        if (warnings.length === 0) {
            return replyInfo(interaction, `${isSelfTarget ? 'You do' : '<@' + targetUser.id + '> does'} not have any warnings.`, 'List Warnings', undefined, undefined, isSelfTarget);
        }

        const pages: string[] = [];
        warnings.reduce((prev, curr, i, { length }) => {
            const page = curr.toString(false);

            if ((i + 1) % 3 === 0 || i === length - 1) {
                pages.push(prev + '\n\n' + page);
                return '';
            }

            return prev + '\n\n' + page;
        }, '');

        if (isSelfTarget) {
            // DM
            try {
                sendButtonPages(member, member.id, pages, 'Warnings');
                replySuccess(interaction, 'Your warnings have been sent to you in a DM.', 'List Warnings', true);
            } catch {
                replyError(interaction, "Failed to send you a DM. Please make sure that they're open and try again.", 'List Warnings', true);
            }
        } else {
            // public
            replyButtonPages(interaction, pages, `Warnings - ${targetUser.tag}`);
        }
    },
};
