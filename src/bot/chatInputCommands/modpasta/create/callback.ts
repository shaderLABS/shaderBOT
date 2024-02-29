import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import log from '../../../lib/log.ts';
import { parseUser } from '../../../lib/misc.ts';
import { Pasta } from '../../../lib/pasta.ts';
import { pastaStore } from '../../../pastaHandler.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const pasta = new Pasta({ alias });

            await pasta.save();
            pastaStore.set(pasta.alias, pasta);

            const logString = `${parseUser(interaction.user)} created the pasta \`${pasta.alias}\`.`;

            replySuccess(interaction, logString, 'Create Pasta');
            log(logString, 'Create Pasta');
        } catch {
            replyError(interaction, 'Failed to save pasta.');
        }
    },
};
