import { BanAppeal } from '../../lib/banAppeal.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Punishment } from '../../lib/punishment.ts';
import type { ModalSubmitCallback } from '../../modalSubmitHandler.ts';

export const modal: ModalSubmitCallback = {
    customID: 'acceptBanAppeal',
    callback: async (interaction, appealID) => {
        if (!appealID) return;

        try {
            const appeal = await BanAppeal.getByUUID(appealID);
            const logString = await appeal.close('accepted', interaction.fields.getTextInputValue('reasonInput'), interaction.user.id);

            const ban = await Punishment.getByUserID(appeal.userID, 'ban');
            await ban.move(interaction.user.id);

            replySuccess(interaction, logString, 'Accept Ban Appeal');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
