import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageMessages,
    callback: async (interaction) => {
        const { channel } = interaction;

        const count = interaction.options.getInteger('amount', true);
        if (isNaN(count) || count < 0 || count > 100) {
            replyError(interaction, 'Please use a number between 0 and 100 as the first argument.');
            return;
        }

        const { size } = await channel.bulkDelete(count, true);
        replySuccess(interaction, `${size} (out of ${count}) message(s) have been deleted.`, 'Purge Messages', true);
        log(`${parseUser(interaction.user)} deleted ${size} (out of ${count}) message(s) in <#${channel.id}>.`, 'Purge Messages');
    },
};
