import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import log from '../../../lib/log.ts';
import { parseUser } from '../../../lib/misc.ts';
import { pastaStore } from '../../../pastaHandler.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const pasta = pastaStore.get(alias);
            if (!pasta) {
                replyError(interaction, 'The specified pasta does not exist.');
                return;
            }

            pastaStore.delete(alias);
            await pasta.delete();

            const logString = `${parseUser(interaction.user)} deleted the pasta \`${alias}\`.`;

            replySuccess(interaction, logString, 'Delete Pasta');
            log(logString, 'Delete Pasta');
        } catch {
            replyError(interaction, `Failed to delete pasta \`${alias}\` from the file system.`);
        }
    },
};
