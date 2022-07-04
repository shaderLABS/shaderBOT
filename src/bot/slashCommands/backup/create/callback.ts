import { ChannelType } from 'discord.js';
import { createBackup } from '../../../lib/backup.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageMessages'],
    callback: async (interaction: GuildCommandInteraction) => {
        const backupChannel = interaction.options.getChannel('channel', false) || interaction.channel;
        if (backupChannel.type !== ChannelType.GuildText && backupChannel.type !== ChannelType.GuildVoice && !backupChannel.isThread()) {
            return replyError(interaction, 'You must specify a text, thread or voice channel.');
        }

        const limit = interaction.options.getInteger('limit', false) || undefined;
        if (limit && limit < 1) return replyError(interaction, 'The message limit must be bigger than one.');

        const backupMessages = await backupChannel.messages.fetch({ limit });

        try {
            await createBackup(backupChannel, backupMessages);
            replySuccess(interaction, `Backup of <#${backupChannel.id}> created. ${backupMessages.size} messages have been encrypted and saved.`, 'Backup');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
