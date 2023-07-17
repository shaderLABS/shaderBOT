import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { Backup } from '../../../lib/backup.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const backupChannel = interaction.options.getChannel('channel', false) || interaction.channel;
        if (backupChannel.type !== ChannelType.GuildText && backupChannel.type !== ChannelType.GuildVoice && !backupChannel.isThread()) {
            replyError(interaction, 'This command is only usable in text, voice or thread channels.', 'Invalid Channel');
            return;
        }

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
