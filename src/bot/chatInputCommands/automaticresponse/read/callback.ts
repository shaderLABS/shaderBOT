import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { automaticResponseStore } from '../../../automaticResponseHandler.ts';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replyInfo } from '../../../lib/embeds.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', false);

        if (alias) {
            const automaticResponse = automaticResponseStore.get(alias);
            if (!automaticResponse) {
                replyError(interaction, 'The specified automatic response does not exist.');
                return;
            }

            try {
                const attachment = new AttachmentBuilder(Buffer.from(automaticResponse.toJSON()), { name: automaticResponse.getFileName() });
                interaction.reply({ files: [attachment] });
            } catch {
                replyError(interaction, 'Failed to send automatic response.');
            }
        } else {
            if (automaticResponseStore.size === 0) {
                replyInfo(interaction, 'There are no automatic responses.');
                return;
            }

            replyInfo(interaction, '`' + [...automaticResponseStore.keys()].join('`, `') + '`', 'All Automatic Responses');
        }
    },
};
