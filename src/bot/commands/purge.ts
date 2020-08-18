import { Command } from '../commandHandler.js';
import log from '../../util/log.js';
import { TextChannel } from 'discord.js';

export const command: Command = {
    commands: ['purge'],
    minArgs: 1,
    maxArgs: 1,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args) => {
        const { channel, member } = message;
        if (!(channel instanceof TextChannel)) return;

        const count = +args[0];

        if (isNaN(count) || count < 0 || count > 100) {
            channel.send('Please use a number between 0 and 100 as the first argument.');
            return;
        }

        await message.delete();
        const deleted = await channel.bulkDelete(count);
        log(`<@${member?.id}> deleted ${deleted.size} (out of ${count}) message(s) in <#${channel.id}>.`);
    },
};
