import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError } from '../../../lib/embeds.ts';
import { pastaStore } from '../../../pastaHandler.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        const pasta = pastaStore.get(alias);
        if (!pasta) {
            replyError(interaction, { description: 'The specified pasta does not exist.' });
            return;
        }

        try {
            const attachment = new AttachmentBuilder(Buffer.from(pasta.toJSON()), { name: pasta.getFileName() });
            interaction.reply({ files: [attachment] });
        } catch {
            replyError(interaction, { description: 'Failed to send pasta.' });
        }
    },
};
