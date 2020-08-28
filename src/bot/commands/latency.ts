import { Command } from '../commandHandler.js';
import { sendInfo } from '../../misc/embeds.js';
import { client } from '../bot.js';

export const command: Command = {
    commands: ['latency'],
    help: 'Display the API and bot latency.',
    minArgs: 0,
    maxArgs: 0,
    callback: async (message) => {
        const { channel } = message;
        const pinging = await sendInfo(channel, 'Pinging...', 'LATENCY');
        const latency = pinging.createdTimestamp - message.createdTimestamp;

        pinging.edit(
            pinging.embeds[0].setDescription('').addFields([
                { name: 'Bot Latency', value: latency + 'ms' },
                { name: 'API Latency', value: client.ws.ping + 'ms' },
            ])
        );
    },
};
