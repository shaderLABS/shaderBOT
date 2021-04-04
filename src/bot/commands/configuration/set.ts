import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { removeArgumentsFromText } from '../../lib/searchMessage.js';
import { update } from '../../settings/settings.js';

export const command: Command = {
    commands: ['set'],
    superCommands: ['configuration', 'config'],
    help: "Edit the bot's current configuration.",
    expectedArgs: '<path> <JSONValue>',
    minArgs: 2,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: (message, args, text) => {
        const { channel } = message;

        try {
            const path = args[0].split('.');
            const value = JSON.parse(removeArgumentsFromText(text, args[0]));

            const oldValue = setValue(settings, path, value);
            if (!oldValue) return sendError(channel, 'The specified path does not exist.');

            update();
            sendSuccess(channel, 'Successfully edited the configuration value.');
            log(`<@${message.author.id}> edited the configuration \`${args[0]}\` from:\n\n\`${oldValue}\`\n\nto:\n\n\`${value}\``);
        } catch {
            sendError(channel, 'Invalid JSON value.');
        }
    },
};

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
