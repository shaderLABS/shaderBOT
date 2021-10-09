import { MessageAttachment } from 'discord.js';
import { autoResponses } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replyInfo } from '../../../lib/embeds.js';
import { autoResponseToJSON, stringToFileName } from '../../../lib/pastaAutoResponse.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', false);

        if (alias) {
            const autoResponse = autoResponses.get(alias);
            if (!autoResponse) return replyError(interaction, 'The specified automatic response does not exist.');

            try {
                const attachment = new MessageAttachment(Buffer.from(autoResponseToJSON(autoResponse)), stringToFileName(alias));
                interaction.reply({ files: [attachment] });
            } catch {
                replyError(interaction, 'Failed to send automatic response.');
            }
        } else {
            if (autoResponses.size === 0) return replyInfo(interaction, 'There are no automatic responses.');
            replyInfo(interaction, '`' + [...autoResponses.keys()].join('`, `') + '`', 'All Automatic Responses');
        }
    },
};
