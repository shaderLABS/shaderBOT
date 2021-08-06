import { Collection, DMChannel, Guild, GuildMember, Message, PermissionString, Snowflake, TextChannel, ThreadChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { commands, cooldowns, settings } from './bot.js';
import { sendError } from './lib/embeds.js';

export interface GuildMessage extends Message {
    channel: TextChannel | ThreadChannel;
    guild: Guild;
    member: GuildMember;
}

export interface Command {
    readonly commands: string[];
    readonly help: string;
    readonly expectedArgs?: string;
    readonly minArgs?: number;
    readonly maxArgs?: number | null;
    readonly requiredRoles?: Snowflake[];
    readonly requiredPermissions?: PermissionString[];
    readonly permissionOverwrites?: boolean;
    readonly permissionError?: string;
    readonly superCommands?: string[];
    readonly channelWhitelist?: string[];
    readonly cooldownDuration?: number;
    readonly ticketChannels?: boolean;
    readonly callback: (message: GuildMessage, args: string[], text: string) => void;
}

export async function registerCommands(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                registerCommands(path.join(dir, dirEntry.name));
            } else if (dirEntry.name.endsWith('.js')) {
                const { command }: { command: Command } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);

                if (!command.superCommands) {
                    commands.set(JSON.stringify(command.commands), command);
                } else {
                    const superCommand = commands.get(JSON.stringify(command.superCommands)) || new Collection<string, Command>();
                    if (!(superCommand instanceof Collection)) return;

                    superCommand.set(JSON.stringify(command.commands), command);
                    commands.set(JSON.stringify(command.superCommands), superCommand);
                }
            }
        })
    );
}

export function syntaxError(channel: TextChannel | DMChannel | ThreadChannel, syntax: string) {
    sendError(channel, `\`${settings.prefix}${syntax.trimEnd()}\``, 'Syntax Error');
}

export function hasPermissions(message: GuildMessage, command: Command): boolean {
    const { member } = message;

    if (command.requiredPermissions) {
        if (command.permissionOverwrites === true) {
            if (command.requiredPermissions.some((permission) => !member.permissionsIn(message.channel).has(permission))) return false;
        } else {
            if (command.requiredPermissions.some((permission) => !member.permissions.has(permission))) return false;
        }
    }

    if (command.requiredRoles) {
        if (!command.requiredRoles.every((potentialRole) => member.roles.cache.has(potentialRole))) return false;
    }

    return true;
}

function getSubcommandSyntax(invoke: string, subcommands: Collection<string, Command>): string {
    const commands = [...subcommands.keys()].map((cmd) => JSON.parse(cmd).join('|')).join('|');
    return `${invoke} <${commands}>`;
}

export function runCommand(command: Command | Collection<string, Command>, message: GuildMessage, invoke: string, args: string[]): void {
    const { channel } = message;

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

    const {
        expectedArgs = '',
        minArgs = 0,
        maxArgs = null,
        permissionError = 'You do not have permission to run this command.',
        cooldownDuration = 5000,
        channelWhitelist,
        ticketChannels = false,
        callback,
    } = command;

    if (!ticketChannels && channel.parentId && settings.ticket.categoryIDs.includes(channel.parentId)) {
        if (message.deletable) message.delete();
        return;
    }

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

    callback(message, args, args.join(' '));
}

export function commandsToDebugMessage(collection: Collection<string, Command | Collection<string, Command>>): string {
    return [...collection.values()]
        .map((value) => {
            if (value instanceof Collection) return commandsToDebugMessage(value);

            if (value.superCommands) return value.superCommands.join('|') + ' ' + value.commands.join('|');
            else return value.commands.join('|');
        })
        .join('\n\t');
}
