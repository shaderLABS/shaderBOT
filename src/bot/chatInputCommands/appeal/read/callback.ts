import { PermissionFlagsBits } from 'discord.js';
import { client } from '../../../bot.ts';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { BanAppeal } from '../../../lib/banAppeal.ts';
import { replyError } from '../../../lib/embeds.ts';
import { isValidUuid } from '../../../lib/misc.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const appealID = interaction.options.getString('id', false);

        try {
            let appeal: BanAppeal;
            if (appealID) {
                if (!isValidUuid(appealID)) throw 'The specified UUID is invalid.';
                appeal = await BanAppeal.getByUUID(appealID);
            } else {
                if (!interaction.channel.isThread()) throw 'You must either specify a UUID or use this command in the thread of a ban appeal.';
                appeal = await BanAppeal.getByThreadID(interaction.channelId);
            }

            const targetUser = await client.users.fetch(appeal.userId).catch(() => undefined);
            if (!targetUser) {
                replyError(interaction, { description: 'The user who sent the ban appeal could not be resolved.' });
                return;
            }

            interaction.reply({ embeds: [appeal.toAppealEmbed(targetUser), appeal.toResultEmbed()] });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
