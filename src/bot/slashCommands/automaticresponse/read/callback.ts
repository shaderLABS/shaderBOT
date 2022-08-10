import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { automaticResponseStore } from '../../../automaticResponseHandler.js';
import { replyError, replyInfo } from '../../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', false);

        if (alias) {
            const automaticResponse = automaticResponseStore.get(alias);
            if (!automaticResponse) return replyError(interaction, 'The specified automatic response does not exist.');

            try {
                const attachment = new AttachmentBuilder(Buffer.from(automaticResponse.toJSON()), { name: automaticResponse.getFileName() });
                interaction.reply({ files: [attachment] });
            } catch {
                replyError(interaction, 'Failed to send automatic response.');
            }
        } else {
            if (automaticResponseStore.size === 0) return replyInfo(interaction, 'There are no automatic responses.');
            replyInfo(interaction, '`' + [...automaticResponseStore.keys()].join('`, `') + '`', 'All Automatic Responses');
        }
    },
};
