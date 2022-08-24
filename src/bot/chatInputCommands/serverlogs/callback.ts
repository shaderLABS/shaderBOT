import { PermissionFlagsBits } from 'discord.js';
import { settings } from '../../bot.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: (interaction) => {
        interaction.reply({ files: settings.data.serverLogPaths, ephemeral: true }).catch(() => {
            replyError(interaction, 'Failed to retrieve and send the server logs.');
        });

        log(`${parseUser(interaction.user)} has requested the STDOUT and STDERR server logs.`, 'Server Logs');
    },
};
