import { Command } from '../commandHandler.js';
import { sendInfo, sendError } from '../../misc/embeds.js';
import { settings, commands } from '../bot.js';
import { Collection, GuildMember, TextChannel, BitFieldResolvable, PermissionString, Message } from 'discord.js';

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

function hasPermissions(message: Message, command: Command): boolean {
    const { member, channel, guild } = message;

    if (command.requiredPermissions) {
        if (command.permissionOverwrites === true) {
            for (const permission of command.requiredPermissions) {
                if (!member?.permissionsIn(channel).has(permission)) return false;
            }
        } else {
            for (const permission of command.requiredPermissions) {
                if (!member?.hasPermission(permission)) return false;
            }
        }
    }

    if (command.requiredRoles) {
        for (const requiredRole of command.requiredRoles) {
            const role = guild?.roles.cache.find((role) => role.name === requiredRole);
            if (!role || !member?.roles.cache.has(role.id)) return false;
        }
    }

    return true;
}
