import { BanAppeal } from '../../lib/banAppeal.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import type { ModalSubmitCallback } from '../../modalSubmitHandler.ts';

export const modal: ModalSubmitCallback = {
    customID: 'declineBanAppeal',
    callback: async (interaction, appealID) => {
        if (!appealID) return;

        try {
            const appeal = await BanAppeal.getByUUID(appealID);
            const logString = await appeal.close('declined', interaction.fields.getTextInputValue('reasonInput'), interaction.user.id);

            replySuccess(interaction, { description: logString, title: 'Decline Ban Appeal' });
        } catch (error) {
            replyError(interaction, { description: String(error), title: 'Decline Ban Appeal' });
        }
    },
};
