import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replySuccess } from '../../lib/embeds.ts';
import log from '../../lib/log.ts';
import { parseUser, shutdown } from '../../lib/misc.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        await replySuccess(interaction, 'The bot is being restarted...', 'Restart');
        await log(`The bot has been restarted by ${parseUser(interaction.user)}.`, 'Restart');
        shutdown();
    },
};
