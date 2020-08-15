import cfg from '../../cfg.json';
import { BitFieldResolvable, PermissionString, Message } from 'discord.js';
import { CustomClient } from './bot.js';
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

export async function registerCommands(client: CustomClient, dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath);
    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerCommands(client, path.join(dir, file));
        } else if (file.endsWith('.js')) {
            const { command }: { command: Command } = await import(path.join(filePath, file));
            console.log(`Registering command "${file}"...`);

            for (const invoke of command.commands) {
                client.commands.set(invoke, command);
            }
        }
    }
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
        channel.send(`Syntax Error: ${cfg.prefix + invoke} ${expectedArgs}`);
        return;
    }

    callback(message, args, content.slice(cfg.prefix.length + invoke.length).trim());
    return;
}
