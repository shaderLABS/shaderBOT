import { Collection } from 'discord.js';
import { commands, settings } from '../bot.js';
import { Command, hasPermissions } from '../commandHandler.js';
import { embedPages, sendInfo } from '../lib/embeds.js';

export const command: Command = {
    commands: ['help'],
    help: 'Show this help page.',
    minArgs: 0,
    maxArgs: 0,
    callback: async (message) => {
        let pages: string[] = [],
            helpContent = '',
            i = 0;

        for (const [key, value] of commands) {
            if (value instanceof Collection) {
                let subCmdHelp = '';

                value.forEach((subValue, subKey) => {
                    if (hasPermissions(message, subValue)) subCmdHelp += `\n• \`${JSON.parse(subKey).join('|')}\` - ${subValue.help}`;
                });

                if (subCmdHelp !== '') {
                    helpContent += `\`${settings.prefix}${JSON.parse(key).join('|')}\`${subCmdHelp}\n\n`;
                    i++;
                }
            } else {
                if (hasPermissions(message, value)) {
                    helpContent += `\`${settings.prefix}${JSON.parse(key).join('|')}\`\n${value.help}\n\n`;
                    i++;
                }
            }

            if (i === 3) {
                i = 0;
                pages.push(helpContent);
                helpContent = '';
            }
        }

        if (helpContent.length !== 0) pages.push(helpContent);
        embedPages(await sendInfo(message.channel, pages[0], 'HELP'), message.author, pages);
    },
};
