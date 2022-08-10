import { BanAppeal } from '../../lib/banAppeal.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { ModalSubmitCallback } from '../../modalSubmitHandler.js';

export const modal: ModalSubmitCallback = {
    customID: 'declineBanAppeal',
    callback: async (interaction, appealID) => {
        if (!appealID) return;

        try {
            const appeal = await BanAppeal.getByUUID(appealID);
            const logString = await appeal.close('declined', interaction.fields.getTextInputValue('reasonInput'), interaction.user.id);

            replySuccess(interaction, logString, 'Decline Ban Appeal');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
