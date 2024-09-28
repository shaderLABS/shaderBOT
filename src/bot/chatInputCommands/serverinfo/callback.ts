import { EmbedBuilder } from 'discord.js';
import os from 'node:os';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { EmbedColor, EmbedIcon } from '../../lib/embeds.ts';
import { formatBytes } from '../../lib/misc.ts';
import { secondsToString } from '../../lib/time.ts';

export const command: ChatInputCommandCallback = {
    callback: (interaction) => {
        const totalMemory = os.totalmem();
        const systemMemoryUsage = totalMemory - os.freemem();
        const processMemoryUsage = process.memoryUsage().rss;

        interaction.reply({
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: 'Server Information',
                        iconURL: EmbedIcon.Info,
                    },
                    color: EmbedColor.Blue,
                    fields: [
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
                        {
                            name: 'Uptime',
                            value: secondsToString(Math.ceil(process.uptime())),
                            inline: true,
                        },
                        {
                            name: 'Host',
                            value: `Platform: \`${os.platform()}\`, Hostname: \`${os.hostname()}\`, Architecture: \`${os.machine()}\`, Release: \`${os.release()}\`, CPU: \`${os.cpus()[0].model}\``,
                        },
                        {
                            name: 'Runtime',
                            value: Object.entries(process.versions)
                                .map(([key, value]) => `\`${key}\` - ${value}`)
                                .join(', '),
                        },
                    ],
                }),
            ],
        });
    },
};
