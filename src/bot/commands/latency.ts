import { client } from '../bot.js';
import { Command } from '../commandHandler.js';
import { sendInfo } from '../lib/embeds.js';

export const command: Command = {
    commands: ['latency'],
    help: 'Display the API and bot latency.',
    minArgs: 0,
    maxArgs: 0,
    callback: async (message) => {
        const { channel } = message;
        const pinging = await sendInfo(channel, 'Pinging...', 'Latency');
        const latency = pinging.createdTimestamp - message.createdTimestamp;
        const uptime = new Date(process.uptime() * 1000).toISOString().substr(11, 8);

        pinging.edit(
            pinging.embeds[0].setDescription('').addFields([
                { name: 'Bot Latency', value: latency - client.ws.ping + 'ms' },
                { name: 'API Latency', value: client.ws.ping + 'ms' },
                { name: 'Total Latency', value: latency + 'ms' },
                { name: 'Uptime', value: uptime },
            ])
        );
    },
};
