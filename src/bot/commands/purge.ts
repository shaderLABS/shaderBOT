import { Command } from '../commandHandler.js';
import { log } from '../util.js';

export const command: Command = {
    commands: ['purge'],
    minArgs: 1,
    maxArgs: 1,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args) => {
        const count = +args[0];
        const { channel, member, guild } = message;

        if (isNaN(count) || count < 0 || count > 100) {
            channel.send('Please use a number between 0 and 100 as the first argument.');
            return;
        }

        await message.delete();
        const deleted = await channel.bulkDelete(count);
        if (guild) log(guild, `<@${member?.id}> deleted ${deleted.size} (out of ${count}) message(s) in <#${channel.id}>.`);
    },
};
