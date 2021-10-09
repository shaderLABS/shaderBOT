import { MessageAttachment } from 'discord.js';
import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_GUILD'],
    callback: (interaction: GuildCommandInteraction) => {
        const attachment = new MessageAttachment(Buffer.from(JSON.stringify(settings, null, 4)), 'configuration.json');
        interaction.reply({ files: [attachment] });
    },
};
