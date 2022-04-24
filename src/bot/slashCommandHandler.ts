import { ChatInputCommandInteraction, Collection, Guild, GuildMember, PermissionsString, TextChannel, ThreadChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { replyError } from './lib/embeds.js';
import { isTextOrThreadChannel } from './lib/misc.js';

export type ApplicationCommandCallback = {
    readonly channelWhitelist?: string[];
    readonly requiredPermissions?: PermissionsString[];
    readonly permissionOverwrites?: boolean;
    readonly callback: (interaction: GuildCommandInteraction) => void;
};

export interface GuildCommandInteraction extends ChatInputCommandInteraction {
    channel: TextChannel | ThreadChannel;
    guild: Guild;
    member: GuildMember;
}

/***********
 * EXECUTE *
 ***********/

function isGuildInteraction(interaction: ChatInputCommandInteraction): interaction is GuildCommandInteraction {
    return !!interaction.channel && isTextOrThreadChannel(interaction.channel) && !!interaction.guild && !!interaction.member;
}

function hasPermissions(member: GuildMember, channel: TextChannel | ThreadChannel, command: ApplicationCommandCallback) {
    if (command.requiredPermissions) {
        if (command.permissionOverwrites === true) {
            if (command.requiredPermissions.some((permission) => !member.permissionsIn(channel).has(permission))) return false;
        } else {
            if (command.requiredPermissions.some((permission) => !member.permissions.has(permission))) return false;
        }
    }

    return true;
}

export function handleChatInputCommand(interaction: ChatInputCommandInteraction) {
    if (!isGuildInteraction(interaction)) return;

    let command = slashCommands.get(interaction.commandName);
    if (!command) return;

    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    if (command instanceof Collection && subcommandGroup) command = command.get(subcommandGroup);

    const subcommand = interaction.options.getSubcommand(false);
    if (command instanceof Collection && subcommand) command = command.get(subcommand);

    if (!command || command instanceof Collection) return;

    const { channel, member } = interaction;

    /************************************
     * VALIDATE COMMAND AND PERMISSIONS *
     ************************************/

    if (!hasPermissions(member, channel, command)) {
        return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
    }

    if (command.channelWhitelist && !command.channelWhitelist.includes(channel.id)) {
        return replyError(interaction, `This command is only usable in <#${command.channelWhitelist.join('>, <#')}>.`, 'Invalid Channel');
    }

    command.callback(interaction);
}

/************
 * REGISTER *
 ************/

type SlashCommandCollection = Collection<string, SlashCommandCollection | ApplicationCommandCallback>;
export const slashCommands: SlashCommandCollection = new Collection();

export async function registerSlashCommands(dir: string, directories: string[] = []) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await registerSlashCommands(path.join(dir, dirEntry.name), [...directories, dirEntry.name]);
            } else if (dirEntry.name === 'callback.js') {
                const { command }: { command: ApplicationCommandCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);

                let collection = slashCommands;
                const superCommandNames = directories;
                const commandName = superCommandNames.pop();

                superCommandNames.forEach((superCommand) => {
                    if (!collection.get(superCommand)) collection.set(superCommand, new Collection<string, SlashCommandCollection | ApplicationCommandCallback>());
                    const nestedCollection = collection.get(superCommand);
                    // if check technically not needed, but better than suppressing TS errors
                    if (nestedCollection && nestedCollection instanceof Collection) collection = nestedCollection;
                });

                commandName && collection.set(commandName, command);
            }
        })
    );
}
