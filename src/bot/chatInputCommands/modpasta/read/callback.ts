import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError } from '../../../lib/embeds.js';
import { pastaStore } from '../../../pastaHandler.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        const pasta = pastaStore.get(alias);
        if (!pasta) {
            replyError(interaction, 'The specified pasta does not exist.');
            return;
        }

        try {
            const attachment = new AttachmentBuilder(Buffer.from(pasta.toJSON()), { name: pasta.getFileName() });
            interaction.reply({ files: [attachment] });
        } catch {
            replyError(interaction, 'Failed to send pasta.');
        }
    },
};
