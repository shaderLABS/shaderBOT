import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { settings } from '../../../bot.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: (interaction: GuildCommandInteraction) => {
        const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(settings.data, null, 4)), { name: 'configuration.json' });
        interaction.reply({ files: [attachment] });
    },
};
