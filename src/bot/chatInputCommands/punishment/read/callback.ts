import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replyInfo } from '../../../lib/embeds.js';
import { PastPunishment, Punishment } from '../../../lib/punishment.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) {
            replyError(interaction, 'The specified UUID is invalid.');
            return;
        }

        try {
            // more likely, check first
            const pastPunishment = await PastPunishment.getAnyByUUID(id).catch(() => undefined);
            if (pastPunishment) {
                replyInfo(interaction, pastPunishment.toString(true, true), 'Past Punishment');
                return;
            }

            const punishment = await Punishment.getAnyByUUID(id);
            replyInfo(interaction, punishment.toString(true, true), 'Punishment');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
