import { BanAppeal } from '../../lib/banAppeal.ts';
import { replyError, replyInfo, replySuccess } from '../../lib/embeds.ts';
import type { ModalSubmitCallback } from '../../modalSubmitHandler.ts';

export const modal: ModalSubmitCallback = {
    customID: 'editBanAppealResultReason',
    callback: async (interaction, appealID) => {
        if (!appealID) return;

        try {
            const newResultReason = interaction.fields.getTextInputValue('reasonInput');
            const appeal = await BanAppeal.getByUUID(appealID);

            if (appeal.resultReason === newResultReason) {
                replyInfo(
                    interaction,
                    {
                        description: 'The ban appeal was not edited because the result reason has not been changed.',
                        title: 'Edit Ban Appeal Result Reason',
                    },
                    true,
                );
                return;
            }

            const logString = await appeal.editResultReason(newResultReason, interaction.user.id);

            replySuccess(interaction, {
                description: logString,
                title: 'Edit Ban Appeal Result Reason',
            });
        } catch (error) {
            replyError(interaction, {
                description: String(error),
                title: 'Edit Ban Appeal Result Reason',
            });
        }
    },
};
