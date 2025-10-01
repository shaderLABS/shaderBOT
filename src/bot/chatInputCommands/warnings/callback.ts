import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replyError, replyInfo, replySuccess, sendButtonPages } from '../../lib/embeds.ts';
import { Warning } from '../../lib/warning.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const { user } = interaction;

        const warnings = await Warning.getAllByUserID(user.id);

        if (warnings.length === 0) {
            replyInfo(interaction, { description: 'You do not have any warnings.', title: 'Warnings' }, true);
            return;
        }

        const pages: string[] = [];
        warnings.reduce((content, warning, index, { length }) => {
            const page = warning.toString(false, false);

            if ((index + 1) % 3 === 0 || index === length - 1) {
                pages.push(content + '\n\n' + page);
                return '';
            }

            return content + '\n\n' + page;
        }, '');

        try {
            await sendButtonPages(user, user.id, { pages, title: 'Warnings' });
            replySuccess(
                interaction,
                {
                    description: 'Your warnings have been sent to you in a direct message.',
                    title: 'Warnings',
                },
                true,
            );
        } catch {
            replyError(
                interaction,
                {
                    description: 'Failed to send you a direct message. Please make sure that you are able to receive direct messages and try again.',
                    title: 'Warnings',
                },
                true,
            );
        }
    },
};
