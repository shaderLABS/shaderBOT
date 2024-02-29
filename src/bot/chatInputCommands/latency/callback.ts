import { EmbedBuilder } from 'discord.js';
import { client } from '../../bot.ts';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { EmbedColor, EmbedIcon } from '../../lib/embeds.ts';

export const command: ChatInputCommandCallback = {
    callback: (interaction) => {
        const latency = Date.now() - interaction.createdTimestamp;
        const tooltipURL = interaction.channel.url;

        interaction.reply({
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: 'Latency',
                        iconURL: EmbedIcon.Info,
                    },
                    color: EmbedColor.Blue,
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
                    ],
                }),
            ],
        });
    },
};
