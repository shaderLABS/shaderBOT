import { settings } from './bot.js';
import { BitFieldResolvable, PermissionString, Message, TextChannel, DMChannel, NewsChannel, Collection } from 'discord.js';
import { commands } from './bot.js';
import fs from 'fs/promises';
import path from 'path';
import { sendError } from '../misc/embeds.js';

export type Command = {
    commands: string[];
    help: string;
    expectedArgs?: string | undefined;
    minArgs?: number | undefined;
    maxArgs?: number | null | undefined;
    requiredRoles?: string[] | undefined;
    requiredPermissions?: BitFieldResolvable<PermissionString>[] | undefined;
    permissionOverwrites?: boolean | undefined;
    permissionError?: string | undefined;
    superCommands?: string[] | undefined;
    callback: (message: Message, args: string[], text: string) => void;
};

export async function registerCommands(dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath);
    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerCommands(path.join(dir, file));
        } else if (file.endsWith('.js')) {
            const { command }: { command: Command } = await import(path.join(filePath, file));

            if (!command.superCommands) {
                commands.set(JSON.stringify(command.commands), command);
                console.log(`Registered command "${file}".`);
            } else {
                const superCmd = commands.get(JSON.stringify(command.superCommands)) || new Collection<string, Command>();
                if (!(superCmd instanceof Collection)) return;

                superCmd.set(JSON.stringify(command.commands), command);
                commands.set(JSON.stringify(command.superCommands), superCmd);
                console.log(`Registered command "${file}" (subcommand of "${command.superCommands.join('/')}").`);
            }
        }
    }
}

export function syntaxError(channel: TextChannel | DMChannel | NewsChannel, syntax: string) {
    sendError(channel, '`' + settings.prefix + syntax + '`', 'SYNTAX ERROR');
}

export function runCommand(command: Command | Collection<string, Command>, message: Message, invoke: string, args: string[]) {
    if (command instanceof Collection) {
        if (args.length === 0) return syntaxError(message.channel, `${invoke} <${command.keyArray().map((value) => JSON.parse(value)).join('|')}>`);
        const subCommand = command.find((_value, key) => key.includes(args[0].toLowerCase()));
        if (!subCommand) return syntaxError(message.channel, `${invoke} <${command.keyArray().map((value) => JSON.parse(value)).join('|')}>`);

        command = subCommand;
        invoke += ' ' + args[0];
        args.shift();
    }

    let {
        expectedArgs = '',
        minArgs = 0,
        maxArgs = null,
        requiredRoles = [],
        requiredPermissions = [],
        permissionError = 'You do not have permission to run this command.',
        callback,
    } = command;

    const { member, content, channel, guild } = message;

    if (command.permissionOverwrites === true) {
        for (const permission of requiredPermissions) {
            if (!member?.permissionsIn(channel).has(permission)) {
                sendError(channel, permissionError);
                return;
            }
        }
    } else {
        for (const permission of requiredPermissions) {
            if (!member?.hasPermission(permission)) {
                sendError(channel, permissionError);
                return;
            }
        }
    }

    for (const requiredRole of requiredRoles) {
        const role = guild?.roles.cache.find((role) => role.name === requiredRole);

        if (!role) {
            sendError(channel, `The role required to run this command ('${requiredRole}') does not exist.`);
            return;
        }

        if (!member?.roles.cache.has(role.id)) {
            // channel.send(`You do not have the required role ('${role}') to run this comamnd.`);
            sendError(channel, permissionError);
            return;
        }
    }

    if (args.length < minArgs || (maxArgs !== null && args.length > maxArgs)) {
        syntaxError(channel, `${invoke} ${expectedArgs}`);
        return;
    }

    callback(message, args, content.slice(settings.prefix.length + invoke.length).trim());
    return;
}
