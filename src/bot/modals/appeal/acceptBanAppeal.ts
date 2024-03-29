import { BanAppeal } from '../../lib/banAppeal.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Ban } from '../../lib/punishment/ban.js';
import { ModalSubmitCallback } from '../../modalSubmitHandler.js';

export const modal: ModalSubmitCallback = {
    customID: 'acceptBanAppeal',
    callback: async (interaction, appealID) => {
        if (!appealID) return;

        try {
            const appeal = await BanAppeal.getByUUID(appealID);
            const logString = await appeal.close('accepted', interaction.fields.getTextInputValue('reasonInput'), interaction.user.id);

            const ban = await Ban.getByUserID(appeal.userID);
            await ban.lift(interaction.user.id);

            replySuccess(interaction, logString, 'Accept Ban Appeal');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
