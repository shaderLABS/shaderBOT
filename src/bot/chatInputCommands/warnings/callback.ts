import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replyError, replyInfo, replySuccess, sendButtonPages } from '../../lib/embeds.ts';
import { Warning } from '../../lib/warning.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const { user } = interaction;

        const warnings = await Warning.getAllByUserID(user.id);

        if (warnings.length === 0) {
            replyInfo(interaction, 'You do not have any warnings.', 'Warnings', undefined, undefined, true);
            return;
        }

        const pages: string[] = [];
        warnings.reduce((content, warning, index, { length }) => {
            const page = warning.toString(false);

            if ((index + 1) % 3 === 0 || index === length - 1) {
                pages.push(content + '\n\n' + page);
                return '';
            }

            return content + '\n\n' + page;
        }, '');

        try {
            await sendButtonPages(user, user.id, pages, 'Warnings');
            replySuccess(interaction, 'Your warnings have been sent to you in a DM.', 'Warnings', true);
        } catch {
            replyError(interaction, "Failed to send you a DM. Please make sure that they're open and try again.", 'Warnings', true);
        }
    },
};
