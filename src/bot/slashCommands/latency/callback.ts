import { EmbedBuilder } from 'discord.js';
import os from 'os';
import { client } from '../../bot.js';
import { embedColor, embedIcon } from '../../lib/embeds.js';
import { formatBytes } from '../../lib/misc.js';
import { secondsToString } from '../../lib/time.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: (interaction: GuildCommandInteraction) => {
        const latency = Date.now() - interaction.createdTimestamp;

        const uptime = process.uptime();

        const totalMemory = os.totalmem();
        const systemMemoryUsage = totalMemory - os.freemem();
        const processMemoryUsage = process.memoryUsage().rss;

        const tooltipURL = interaction.channel.url;

        interaction.reply({
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: 'Latency',
                        iconURL: embedIcon.info,
                    },
                    color: embedColor.blue,
                    fields: [
                        {
                            name: 'Bot Latency',
                            value: `${latency}ms [[?]](${tooltipURL} "The amount of time between Discord processing an interaction and shaderBOT processing it.")`,
                            inline: true,
                        },
                        {
                            name: 'API Latency',
                            value: `${client.ws.ping}ms [[?]](${tooltipURL} "The amount of time between shaderBOT sending an API request and Discord receiving it.")`,
                            inline: true,
                        },
                        {
                            name: 'Total Latency',
                            value: `${latency + client.ws.ping}ms [[?]](${tooltipURL} "The minimum amount of time between Discord processing an interaction and shaderBOT responding to it.")`,
                            inline: true,
                        },
                        {
                            name: 'Memory Usage (RSS)',
                            value: `${Math.ceil((processMemoryUsage / totalMemory) * 100)}% (${formatBytes(processMemoryUsage)} of ${formatBytes(totalMemory)})`,
                            inline: true,
                        },
                        {
                            name: 'Memory Usage (System)',
                            value: `${Math.ceil((systemMemoryUsage / totalMemory) * 100)}% (${formatBytes(systemMemoryUsage)} of ${formatBytes(totalMemory)})`,
                            inline: true,
                        },
                        { name: 'Uptime', value: secondsToString(Math.ceil(uptime)), inline: true },
                    ],
                }),
            ],
        });
    },
};
