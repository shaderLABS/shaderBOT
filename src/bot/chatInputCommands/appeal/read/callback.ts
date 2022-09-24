import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { client } from '../../../bot.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { BanAppeal } from '../../../lib/banAppeal.js';
import { replyError } from '../../../lib/embeds.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const appealID = interaction.options.getString('id', false);

        try {
            let appeal: BanAppeal;
            if (appealID) {
                if (!uuid.test(appealID)) throw 'The specified UUID is invalid.';
                appeal = await BanAppeal.getByUUID(appealID);
            } else {
                if (!interaction.channel.isThread()) throw 'You must either specify a UUID or use this command in the thread of a ban appeal.';
                appeal = await BanAppeal.getByThreadID(interaction.channelId);
            }

            const targetUser = await client.users.fetch(appeal.userID).catch(() => undefined);
            if (!targetUser) return replyError(interaction, 'The user who sent the ban appeal could not be resolved.');

            interaction.reply({ embeds: [appeal.toAppealEmbed(targetUser), appeal.toResultEmbed()] });
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
