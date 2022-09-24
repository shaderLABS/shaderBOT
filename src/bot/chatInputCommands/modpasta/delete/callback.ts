import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { pastaStore } from '../../../pastaHandler.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const pasta = pastaStore.get(alias);
            if (!pasta) return replyError(interaction, 'The specified pasta does not exist.');

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
