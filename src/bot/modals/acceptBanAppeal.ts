import { BanAppeal } from '../lib/banAppeal.js';
import { replyError, replySuccess } from '../lib/embeds.js';
import { Punishment } from '../lib/punishment.js';
import { ModalSubmitCallback } from '../modalSubmitHandler.js';

export const modal: ModalSubmitCallback = {
    customID: 'acceptBanAppeal',
    callback: async (interaction, targetUserID) => {
        if (!targetUserID) return;

        try {
            const appeal = await BanAppeal.getPendingByUserID(targetUserID);
            const logString = await appeal.close('accepted', interaction.fields.getTextInputValue('reasonInput'), interaction.user.id);

            const ban = await Punishment.getByUserID(targetUserID, 'ban');
            await ban.move(interaction.user.id);

            replySuccess(interaction, logString, 'Accept Ban Appeal');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
