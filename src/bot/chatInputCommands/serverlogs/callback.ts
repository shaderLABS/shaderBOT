import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { settings } from '../../bot.ts';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replyError } from '../../lib/embeds.ts';
import log from '../../lib/log.ts';
import { parseUser } from '../../lib/misc.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: (interaction) => {
        interaction.reply({ files: settings.data.serverLogPaths, flags: MessageFlags.Ephemeral }).catch(() => {
            replyError(interaction, { description: 'Failed to retrieve and send the server logs.' });
        });

        log(`${parseUser(interaction.user)} has requested the STDOUT and STDERR server logs.`, 'Server Logs');
    },
};
