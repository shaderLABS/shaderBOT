import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { update } from '../../../settings/settings.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

function setValue(obj: any, path: string[], value: any) {
    let oldValue: any;

    path.reduce((a, b, i) => {
        if (i + 1 === path.length) {
            oldValue = a[b];
            if (typeof oldValue !== typeof value) throw new Error();

            a[b] = value;
            return value;
        }
        return a[b];
    }, obj);

    return oldValue;
}

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_GUILD'],
    callback: (interaction: GuildCommandInteraction) => {
        try {
            const path = interaction.options.getString('path', true);
            const value = JSON.parse(interaction.options.getString('value', true));

            const oldValue = setValue(settings, path.split('.'), value);
            if (!oldValue) return replyError(interaction, 'The specified path does not exist.');

            update();
            replySuccess(interaction, 'Successfully edited the configuration value.', 'Edit Configuration');
            log(`${parseUser(interaction.user)} edited the configuration \`${path}\` from:\n\n\`${oldValue}\`\n\nto:\n\n\`${value}\``, 'Edit Configuration');
        } catch {
            replyError(interaction, 'Invalid path or JSON value.');
        }
    },
};
