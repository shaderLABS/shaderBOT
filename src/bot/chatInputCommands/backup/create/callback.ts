import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { Backup } from '../../../lib/backup.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const backupChannel = interaction.options.getChannel('channel', false, Backup.CHANNEL_TYPES) || interaction.channel;

        const limit = interaction.options.getInteger('limit', false) || undefined;
        if (limit && limit < 1) {
            replyError(interaction, 'The message limit must be bigger than one.');
            return;
        }

        const backupMessages = await backupChannel.messages.fetch({ limit });

        try {
            await Backup.create(backupChannel, backupMessages);
            replySuccess(interaction, `Backup of <#${backupChannel.id}> created. ${backupMessages.size} messages have been encrypted and saved.`, 'Backup');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
