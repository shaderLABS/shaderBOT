import uuid from 'uuid-random';
import { replyError, replyInfo } from '../../../lib/embeds.js';
import { PastPunishment, Punishment } from '../../../lib/punishment.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BanMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        try {
            // more likely, check first
            const pastPunishment = await PastPunishment.getAnyByUUID(id).catch(() => undefined);
            if (pastPunishment) return replyInfo(interaction, pastPunishment.toString(true, true), 'Past Punishment');

            const punishment = await Punishment.getAnyByUUID(id);
            return replyInfo(interaction, punishment.toString(true, true), 'Punishment');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
