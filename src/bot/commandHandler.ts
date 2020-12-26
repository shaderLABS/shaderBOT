import { BitFieldResolvable, Collection, DMChannel, Guild, GuildMember, Message, NewsChannel, PermissionString, TextChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { commands, settings } from './bot.js';
import { sendError } from './lib/embeds.js';

export type GuildMessage = Message & { channel: TextChannel; guild: Guild; member: GuildMember };

export function isGuildMessage(message: Message): message is GuildMessage {
    return message.channel.type === 'text' && !!message.guild && !!message.member;
}

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
    cooldownDuration?: number;
    callback: (message: GuildMessage, args: string[], text: string) => void;
};

export async function registerCommands(dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath);
    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerCommands(path.join(dir, file));
        } else if (file.endsWith('.js')) {
            const { command }: { command: Command } = await import(url.pathToFileURL(path.join(filePath, file)).href);

            if (!command.superCommands) {
                commands.set(JSON.stringify(command.commands), command);
                console.log('\x1b[30m\x1b[1m%s\x1b[0m', `Registered command "${file}".`);
            } else {
                const superCmd = commands.get(JSON.stringify(command.superCommands)) || new Collection<string, Command>();
                if (!(superCmd instanceof Collection)) return;

                superCmd.set(JSON.stringify(command.commands), command);
                commands.set(JSON.stringify(command.superCommands), superCmd);
                console.log('\x1b[30m\x1b[1m%s\x1b[0m', `Registered command "${file}" (subcommand of "${command.superCommands.join('/')}").`);
            }
        }
    }
}

export function syntaxError(channel: TextChannel | DMChannel | NewsChannel, syntax: string) {
    sendError(channel, '`' + settings.prefix + syntax + '`', 'Syntax Error');
}

export function hasPermissions(message: GuildMessage, command: Command): boolean {
    const { member } = message;

    if (command.requiredPermissions) {
        if (command.permissionOverwrites === true) {
            if (!command.requiredPermissions.every((permission) => member.permissionsIn(message.channel).has(permission))) return false;
        } else {
            if (!command.requiredPermissions.every((permission) => member.hasPermission(permission))) return false;
        }
    }

    if (command.requiredRoles) {
        if (
            !command.requiredRoles.every((potentialRole) => {
                const role = message.guild.roles.cache.find((role) => role.name === potentialRole);
                return member.roles.cache.has(role ? role.id : potentialRole);
            })
        )
            return false;
    }

    return true;
}

const cooldowns: Map<string, boolean> = new Map();

export function runCommand(command: Command | Collection<string, Command>, message: GuildMessage, invoke: string, args: string[]): void {
    const { content, channel, mentions } = message;

    /****************
     * SUB-COMMANDS *
     ****************/

    if (command instanceof Collection) {
        if (args.length === 0)
            return syntaxError(
                channel,
                `${invoke} <${command
                    .keyArray()
                    .map((value) => JSON.parse(value).join('|'))
                    .join('|')}>`
            );
        const subCommand = command.find((_value, key) => key.includes(args[0].toLowerCase()));
        if (!subCommand)
            return syntaxError(
                channel,
                `${invoke} <${command
                    .keyArray()
                    .map((value) => JSON.parse(value).join('|'))
                    .join('|')}>`
            );

        return runCommand(subCommand, message, invoke + ' ' + args.shift(), args);
    }

    /******************
     * CHECK COOLDOWN *
     ******************/

    const cooldownID = `${message.author.id}:${command.commands[0]}`;
    const currentCooldown = cooldowns.get(cooldownID);
    if (currentCooldown !== undefined) {
        if (!currentCooldown) {
            sendError(channel, 'Please wait a few seconds.').then((msg) => {
                setTimeout(() => msg.delete(), 7500);
                cooldowns.set(cooldownID, true);
            });
        }
        return;
    }

    /************************************
     * VALIDATE COMMAND AND PERMISSIONS *
     ************************************/

    if (mentions.members && mentions.members.size > 1) {
        sendError(channel, "You can't mention more than one member at a time.");
        return;
    }

    const { expectedArgs = '', minArgs = 0, maxArgs = null, permissionError = 'You do not have permission to run this command.', cooldownDuration = 5000, callback } = command;

    if (!hasPermissions(message, command)) {
        sendError(channel, permissionError);
        return;
    }

    if (args.length < minArgs || (maxArgs !== null && args.length > maxArgs)) return syntaxError(channel, `${invoke} ${expectedArgs}`);

    /****************
     * SET COOLDOWN *
     ****************/

    setTimeout(() => cooldowns.delete(cooldownID), cooldownDuration);
    cooldowns.set(cooldownID, false);

    /*******
     * RUN *
     *******/

    callback(message, args, content.slice(settings.prefix.length + invoke.length).trim());
}
