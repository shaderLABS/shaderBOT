import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { setObjectValueByStringPath } from '../../../lib/objectManipulation.js';
import { Pasta } from '../../../lib/pasta.js';
import { pastaStore } from '../../../pastaHandler.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const oldPasta = pastaStore.get(alias);
            if (!oldPasta) {
                replyError(interaction, 'The specified pasta does not exist.');
                return;
            }

            const pastaData = oldPasta.toData();

            const objPath = interaction.options.getString('path', true);
            const rawValue = interaction.options.getString('value', false);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setObjectValueByStringPath(pastaData, objPath, jsonValue);

            const newPasta = new Pasta(pastaData);

            await newPasta.save();
            pastaStore.set(newPasta.alias, newPasta);

            if (alias !== newPasta.alias) {
                pastaStore.delete(alias);
                if (oldPasta.getFileName() !== newPasta.getFileName()) await oldPasta.delete();
            }

            const logString = `${parseUser(interaction.user)} updated the pasta \`${newPasta.alias}\`.`;

            replySuccess(interaction, logString, 'Update Pasta');
            log(logString, 'Update Pasta');
        } catch (error) {
            replyError(interaction, 'Invalid path or JSON value.');
        }
    },
};
