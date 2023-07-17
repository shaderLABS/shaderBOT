import { BanAppeal } from '../../lib/banAppeal.js';
import { replyError, replyInfo, replySuccess } from '../../lib/embeds.js';
import { ModalSubmitCallback } from '../../modalSubmitHandler.js';

export const modal: ModalSubmitCallback = {
    customID: 'editBanAppealResultReason',
    callback: async (interaction, appealID) => {
        if (!appealID) return;

        try {
            const newResultReason = interaction.fields.getTextInputValue('reasonInput');
            const appeal = await BanAppeal.getByUUID(appealID);

            if (appeal.resultReason === newResultReason) {
                replyInfo(interaction, 'The ban appeal was not edited because the result reason has not been changed.', 'Edit Ban Appeal Result Reason', undefined, undefined, true);
                return;
            }

            const logString = await appeal.editResultReason(newResultReason, interaction.user.id);

            replySuccess(interaction, logString, 'Edit Ban Appeal Result Reason');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
