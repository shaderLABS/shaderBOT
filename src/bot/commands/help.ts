import { Command, hasPermissions } from '../commandHandler.js';
import { sendInfo, embedPages } from '../lib/embeds.js';
import { settings, commands } from '../bot.js';
import { Collection } from 'discord.js';

export const command: Command = {
    commands: ['help'],
    help: 'Show this help page.',
    minArgs: 0,
    maxArgs: 0,
    callback: async (message) => {
        let pages: string[] = [];
        let helpContent = '';
        let index = 0;
        for (var [key, value] of commands) {
            if (value instanceof Collection) {
                let subCmdHelp = '';

                value.forEach((subValue, subKey) => {
                    if (hasPermissions(message, subValue)) subCmdHelp += `\n• \`${JSON.parse(subKey).join('|')}\` - ${subValue.help}`;
                });

                if (subCmdHelp !== '') {
                    helpContent += `\`${settings.prefix}${JSON.parse(key).join('|')}\`${subCmdHelp}\n\n`;
                    index++;
                }
            } else {
                if (hasPermissions(message, value)) {
                    helpContent += `\`${settings.prefix}${JSON.parse(key).join('|')}\`\n${value.help}\n\n`;
                    index++;
                }
            }

            if (index === 3) {
                index = 0;
                pages.push(helpContent);
                helpContent = '';
            }
        }

        pages.push(helpContent);

        embedPages(await sendInfo(message.channel, pages[0], 'HELP'), message.author, pages);
    },
};
