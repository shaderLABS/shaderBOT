import { PermissionFlagsBits } from 'discord.js';
import { automaticResponseStore } from '../../../automaticResponseHandler.ts';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { AutomaticResponse } from '../../../lib/automaticResponse.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import log from '../../../lib/log.ts';
import { parseUser } from '../../../lib/misc.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);
        const regex = interaction.options.getString('regex', true);

        try {
            const automaticResponse = new AutomaticResponse({ alias, regex });

            await automaticResponse.save();
            automaticResponseStore.set(automaticResponse.alias, automaticResponse);

            const logString = `${parseUser(interaction.user)} created the automatic response \`${automaticResponse.alias}\`.`;

            replySuccess(interaction, logString, 'Create Automatic Response');
            log(logString, 'Create Automatic Response');
        } catch {
            replyError(interaction, 'Failed to save the automatic response.');
        }
    },
};
