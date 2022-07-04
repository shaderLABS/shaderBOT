import { AttachmentBuilder } from 'discord.js';
import { settings } from '../../../bot.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageGuild'],
    callback: (interaction: GuildCommandInteraction) => {
        const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(settings.data, null, 4)), { name: 'configuration.json' });
        interaction.reply({ files: [attachment] });
    },
};
