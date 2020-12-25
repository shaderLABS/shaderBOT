import { Command } from '../commandHandler.js';
import { sendError } from '../lib/embeds.js';
import log from '../lib/log.js';

export const command: Command = {
    commands: ['purge'],
    help: 'Bulk delete messages in the current channel.',
    minArgs: 1,
    maxArgs: 1,
    expectedArgs: '<amount>',
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args) => {
        const { channel } = message;

        const count = +args[0];

        if (isNaN(count) || count < 0 || count > 100) {
            sendError(channel, 'Please use a number between 0 and 100 as the first argument.');
            return;
        }

        await message.delete();
        const deleted = await channel.bulkDelete(count);
        log(`<@${message.member.id}> deleted ${deleted.size} (out of ${count}) message(s) in <#${channel.id}>.`);
    },
};
