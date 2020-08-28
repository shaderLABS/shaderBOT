import { Command, hasPermissions } from '../commandHandler.js';
import { sendInfo } from '../lib/embeds.js';
import { settings, commands } from '../bot.js';
import { Collection } from 'discord.js';

export const command: Command = {
    commands: ['help'],
    help: 'Show this help page.',
    minArgs: 0,
    maxArgs: 0,
    callback: (message) => {
        let helpContent = '';
        commands.forEach((value, key) => {
            if (value instanceof Collection) {
                let subCmdHelp = '';

                value.forEach((subValue, subKey) => {
                    if (hasPermissions(message, subValue)) subCmdHelp += `\n• \`${JSON.parse(subKey).join('|')}\` - ${subValue.help}`;
                });

                if (subCmdHelp !== '') helpContent += `\`${settings.prefix}${JSON.parse(key).join('|')}\`${subCmdHelp}\n\n`;
            } else {
                if (hasPermissions(message, value)) helpContent += `\`${settings.prefix}${JSON.parse(key).join('|')}\`\n${value.help}\n\n`;
            }
        });

        sendInfo(message.channel, helpContent, 'HELP');
    },
};
