import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyError } from '../../lib/embeds.js';
import { pastaStore } from '../../pastaHandler.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        const pasta = pastaStore.get(alias);
        if (!pasta) {
            replyError(interaction, 'Pasta not found.');
            return;
        }

        try {
            await pasta.reply(interaction);
        } catch (error) {
            replyError(interaction, `The pasta \`${pasta.alias}\` is invalid: \`${error}\``);
        }
    },
};
