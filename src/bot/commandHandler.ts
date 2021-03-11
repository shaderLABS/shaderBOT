import { BitFieldResolvable, Collection, DMChannel, Guild, GuildMember, Message, NewsChannel, PermissionString, TextChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { commands, settings } from './bot.js';
import { sendError } from './lib/embeds.js';

export interface GuildMessage extends Message {
    channel: TextChannel;
    guild: Guild;
    member: GuildMember;
}

export function isGuildMessage(message: Message): message is GuildMessage {
    return message.channel.type === 'text' && !!message.guild && !!message.member;
}

export interface Command {
    readonly commands: string[];
    readonly help: string;
    readonly expectedArgs?: string;
    readonly minArgs?: number;
    readonly maxArgs?: number | null;
    readonly requiredRoles?: string[];
    readonly requiredPermissions?: BitFieldResolvable<PermissionString>[];
    readonly permissionOverwrites?: boolean;
    readonly permissionError?: string;
    readonly superCommands?: string[];
    readonly channelWhitelist?: string[];
    readonly cooldownDuration?: number;
    readonly callback: (message: GuildMessage, args: string[], text: string) => void;
}

export async function registerCommands(dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath);
    for (const file of files) {
        const stat = await fs.stat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerCommands(path.join(dir, file));
        } else if (file.endsWith('.js')) {
            const { command }: { command: Command } = await import(url.pathToFileURL(path.join(filePath, file)).href);

            if (!command.superCommands) {
                console.debug('\x1b[30m\x1b[1m%s\x1b[0m', `Registering command "${file}"...`);
                commands.set(JSON.stringify(command.commands), command);
            } else {
                const superCmd = commands.get(JSON.stringify(command.superCommands)) || new Collection<string, Command>();
                if (!(superCmd instanceof Collection)) return;

                console.debug('\x1b[30m\x1b[1m%s\x1b[0m', `Registering command "${file}" (sub-command of "${command.superCommands.join('/')}")...`);
                superCmd.set(JSON.stringify(command.commands), command);
                commands.set(JSON.stringify(command.superCommands), superCmd);
            }
        }
    }
}

export function syntaxError(channel: TextChannel | DMChannel | NewsChannel, syntax: string) {
    sendError(channel, `\`${settings.prefix}${syntax.trimEnd()}\``, 'Syntax Error');
}

export function hasPermissions(message: GuildMessage, command: Command): boolean {
    const { member } = message;

    if (command.requiredPermissions) {
        if (command.permissionOverwrites === true) {
            if (command.requiredPermissions.some((permission) => !member.permissionsIn(message.channel).has(permission))) return false;
        } else {
            if (command.requiredPermissions.some((permission) => !member.hasPermission(permission))) return false;
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

function getSubcommandSyntax(invoke: string, subcommands: Collection<string, Command>): string {
    const commands = subcommands
        .keyArray()
        .map((cmd) => JSON.parse(cmd).join('|'))
        .join('|');

    return `${invoke} <${commands}>`;
}

export function runCommand(command: Command | Collection<string, Command>, message: GuildMessage, invoke: string, args: string[]): void {
    const { content, channel } = message;

    /****************
     * SUB-COMMANDS *
     ****************/

    if (command instanceof Collection) {
        if (args.length === 0) return syntaxError(channel, getSubcommandSyntax(invoke, command));

        const subCommand = command.find((_value, key) => key.includes(args[0].toLowerCase()));
        if (!subCommand) return syntaxError(channel, getSubcommandSyntax(invoke, command));

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

    const { expectedArgs = '', minArgs = 0, maxArgs = null, permissionError = 'You do not have permission to run this command.', cooldownDuration = 5000, channelWhitelist, callback } = command;

    if (channelWhitelist && !channelWhitelist.includes(channel.id)) {
        sendError(channel, `This command is only usable in <#${channelWhitelist.join('>, <#')}>.`, 'Invalid Channel');
        return;
    }

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

    callback(
        message,
        args,
        content
            .slice(settings.prefix.length + invoke.length)
            .replaceAll(/(?<!\\)"/g, '')
            .trim()
    );
}
