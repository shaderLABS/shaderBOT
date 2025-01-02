import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replyError } from '../../lib/embeds.ts';
import { pastaStore } from '../../pastaHandler.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        const pasta = pastaStore.get(alias);
        if (!pasta) {
            replyError(interaction, { description: 'Pasta not found.' });
            return;
        }

        try {
            await pasta.reply(interaction);
        } catch (error) {
            replyError(interaction, { description: `The pasta \`${pasta.alias}\` is invalid: \`${error}\`` });
        }
    },
};
