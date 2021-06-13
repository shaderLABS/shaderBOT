import { CommandInteraction, Message, MessageEmbed } from 'discord.js';
import { client } from '../../bot.js';
import { embedColor } from '../../lib/embeds.js';
import { secondsToString } from '../../lib/time.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: CommandInteraction) => {
        await interaction.reply({
            embeds: [
                new MessageEmbed({
                    title: 'Latency',
                    description: 'Pinging...',
                    color: embedColor.blue,
                }),
            ],
        });

        const reply = await interaction.fetchReply();
        if (!(reply instanceof Message)) return;

        const latency = reply.createdTimestamp - interaction.createdTimestamp;
        const uptime = secondsToString(Math.floor(process.uptime()));

        interaction.editReply({
            embeds: [
                new MessageEmbed(
                    reply.embeds[0].setDescription('').addFields([
                        { name: 'Bot Latency', value: latency - client.ws.ping + 'ms' },
                        { name: 'API Latency', value: client.ws.ping + 'ms' },
                        { name: 'Total Latency', value: latency + 'ms' },
                        { name: 'Uptime', value: uptime },
                    ])
                ),
            ],
        });
    },
};
