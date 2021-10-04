import { GuildChannel } from 'discord.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { createBackup } from '../../../lib/backup.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { isTextOrThreadChannel } from '../../../lib/misc.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (interaction: GuildCommandInteraction) => {
        const backupChannel = (interaction.options.getChannel('channel', false) as GuildChannel | null) || interaction.channel;
        if (!isTextOrThreadChannel(backupChannel)) return replyError(interaction, 'You must specify a text or thread channel.');

        const limit = interaction.options.getInteger('limit', false) || undefined;
        if (limit && limit < 1) return replyError(interaction, 'The message limit must be bigger than one.');

        const backupMessages = await backupChannel.messages.fetch({ limit: limit });

        try {
            await createBackup(backupChannel, backupMessages);
            replySuccess(interaction, `Backup of <#${backupChannel.id}> created. ${backupMessages.size} messages have been encrypted and saved.`, 'Backup');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};