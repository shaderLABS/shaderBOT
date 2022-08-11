import { PermissionFlagsBits } from 'discord.js';
import { automaticResponseStore } from '../../../automaticResponseHandler.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { AutomaticResponse } from '../../../lib/automaticResponse.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);
        const regex = interaction.options.getString('regex', true);

        try {
            const automaticResponse = new AutomaticResponse({ alias, regex });

            await automaticResponse.save();
            automaticResponseStore.set(automaticResponse.alias, automaticResponse);

            replySuccess(interaction, `Successfully created the automatic response \`${automaticResponse.alias}\`.`, 'Create Automatic Response');
            log(`${parseUser(interaction.user)} created the automatic response \`${automaticResponse.alias}\`.`, 'Create Automatic Response');
        } catch {
            replyError(interaction, 'Failed to save the automatic response.');
        }
    },
};
