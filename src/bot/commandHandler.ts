import { settings } from './bot.js';
import { BitFieldResolvable, PermissionString, Message, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import { commands } from './bot.js';
import fs from 'fs/promises';
import path from 'path';

export type Command = {
    commands: string[];
    expectedArgs?: string | undefined;
    minArgs?: number | undefined;
    maxArgs?: number | null | undefined;
    requiredRoles?: string[] | undefined;
    requiredPermissions?: BitFieldResolvable<PermissionString>[] | undefined;
    permissionError?: string | undefined;
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
            console.log(`Registering command "${file}"...`);

            for (const invoke of command.commands) {
                commands.set(invoke, command);
            }
        }
    }
}

export function syntaxError(channel: TextChannel | DMChannel | NewsChannel, syntax: string) {
    channel.send(`Syntax Error: ${settings.prefix + syntax}`);
}

export function runCommand(command: Command, message: Message, invoke: string, args: string[]): void {
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

    for (const permission of requiredPermissions) {
        if (!member?.hasPermission(permission)) {
            channel.send(permissionError);
            return;
        }
    }

    for (const requiredRole of requiredRoles) {
        const role = guild?.roles.cache.find((role) => role.name === requiredRole);

        if (!role) {
            channel.send(`The role required to run this command ('${requiredRole}') does not exist.`);
            return;
        }

        if (!member?.roles.cache.has(role.id)) {
            // channel.send(`You do not have the required role ('${role}') to run this comamnd.`);
            channel.send(permissionError);
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
