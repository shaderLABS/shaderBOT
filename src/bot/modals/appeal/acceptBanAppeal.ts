import { BanAppeal } from '../../lib/banAppeal.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Ban } from '../../lib/punishment/ban.ts';
import type { ModalSubmitCallback } from '../../modalSubmitHandler.ts';

export const modal: ModalSubmitCallback = {
    customID: 'acceptBanAppeal',
    callback: async (interaction, appealID) => {
        if (!appealID) return;

        try {
            const appeal = await BanAppeal.getByUUID(appealID);
            const logString = await appeal.close('accepted', interaction.fields.getTextInputValue('reasonInput'), interaction.user.id);

            const ban = await Ban.getByUserID(appeal.userId);
            await ban.lift(interaction.user.id);

            replySuccess(interaction, { description: logString, title: 'Accept Ban Appeal' });
        } catch (error) {
            replyError(interaction, { description: String(error), title: 'Accept Ban Appeal' });
        }
    },
};
