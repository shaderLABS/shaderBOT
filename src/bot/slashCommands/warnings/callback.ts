import { replyError, replyInfo, replySuccess, sendButtonPages } from '../../lib/embeds.js';
import { Warning } from '../../lib/warning.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { user } = interaction;

        const warnings = await Warning.getAllByUserID(user.id);

        if (warnings.length === 0) {
            return replyInfo(interaction, 'You do not have any warnings.', 'Warnings', undefined, undefined, true);
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

        try {
            sendButtonPages(user, user.id, pages, 'Warnings');
            replySuccess(interaction, 'Your warnings have been sent to you in a DM.', 'Warnings', true);
        } catch {
            replyError(interaction, "Failed to send you a DM. Please make sure that they're open and try again.", 'Warnings', true);
        }
    },
};
