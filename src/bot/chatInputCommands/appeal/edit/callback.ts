import { ActionRowBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle } from 'discord.js';
import uuid from 'uuid-random';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { BanAppeal } from '../../../lib/banAppeal.ts';
import { replyError } from '../../../lib/embeds.ts';
import { hasPermissionForTarget } from '../../../lib/searchMessage.ts';

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

            if (!(await hasPermissionForTarget(interaction, appeal.userId))) return;

            if (appeal.result === 'pending') throw 'The specified ban appeal is still pending.';
            if (appeal.result === 'expired') throw 'The specified ban appeal is expired.';

            const reasonInput = new TextInputBuilder({
                customId: 'reasonInput',
                label: 'Reason',
                style: TextInputStyle.Paragraph,
                value: appeal.resultReason ?? undefined,
                maxLength: 2048,
                required: true,
            });

            const modal = new ModalBuilder({
                customId: 'editBanAppealResultReason:' + appeal.id,
                title: 'Edit Ban Appeal Result Reason',
                components: [new ActionRowBuilder<TextInputBuilder>({ components: [reasonInput] })],
            });

            interaction.showModal(modal);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
