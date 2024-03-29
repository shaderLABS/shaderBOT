import { PermissionFlagsBits } from 'discord.js';
import { settings } from '../../../bot.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { updateObjectValueByStringPath } from '../../../lib/objectManipulation.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: (interaction) => {
        try {
            const path = interaction.options.getString('path', true);
            const newValue = JSON.parse(interaction.options.getString('value', true));

            const oldValue = updateObjectValueByStringPath(settings.data, path, newValue);
            if (oldValue === undefined) {
                replyError(interaction, 'The specified path does not exist.');
                return;
            }

            settings.save();

            const logString = `${parseUser(interaction.user)} edited the configuration \`${path}\`.\n\n**Before**\n\`${JSON.stringify(oldValue, null, '\t')}\`\n\n**After**\n\`${JSON.stringify(
                newValue,
                null,
                '\t'
            )}\``;

            replySuccess(interaction, logString, 'Edit Configuration');
            log(logString, 'Edit Configuration');
        } catch (error) {
            replyError(interaction, typeof error === 'string' ? error : 'Invalid path or JSON value.');
        }
    },
};
