import { AnyThreadChannel, ChannelType, ChatInputCommandInteraction, Collection, GuildMember, PermissionResolvable, TextChannel, VoiceChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { MessageContextMenuCommandCallback, UserContextMenuCommandCallback } from './contextMenuCommandHandler.js';
import { replyError } from './lib/embeds.js';

export type ChatInputCommandCallback = {
    readonly channelWhitelist?: string[];
    readonly requiredPermissions?: PermissionResolvable;
    readonly permissionOverwrites?: boolean;
    readonly callback: (interaction: GuildChatInputCommandInteraction) => void;
};

type ChatInputCommandCollection = Collection<string, ChatInputCommandCollection | ChatInputCommandCallback>;
export const chatInputCommands: ChatInputCommandCollection = new Collection();

export type GuildChatInputCommandInteraction = ChatInputCommandInteraction<'cached'> & {
    channel: TextChannel | AnyThreadChannel | VoiceChannel;
};

/***********
 * EXECUTE *
 ***********/

function isGuildChatInputCommandInteraction(interaction: ChatInputCommandInteraction<'cached'>): interaction is GuildChatInputCommandInteraction {
    return !!interaction.channel && (interaction.channel.type === ChannelType.GuildText || interaction.channel.type === ChannelType.GuildVoice || interaction.channel.isThread());
}

export function hasPermissionsForCommand(
    member: GuildMember,
    channel: TextChannel | AnyThreadChannel | VoiceChannel | string,
    command: ChatInputCommandCallback | MessageContextMenuCommandCallback | UserContextMenuCommandCallback
) {
    if (command.requiredPermissions) {
        if (command.permissionOverwrites === true) {
            if (!member.permissionsIn(channel).has(command.requiredPermissions)) return false;
        } else {
            if (!member.permissions.has(command.requiredPermissions)) return false;
        }
    }

    return true;
}

export function handleChatInputCommand(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!isGuildChatInputCommandInteraction(interaction)) return;

    let command = chatInputCommands.get(interaction.commandName);
    if (!command) return;

    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    if (command instanceof Collection && subcommandGroup) command = command.get(subcommandGroup);

    const subcommand = interaction.options.getSubcommand(false);
    if (command instanceof Collection && subcommand) command = command.get(subcommand);

    if (!command || command instanceof Collection) return;

    /************************************
     * VALIDATE COMMAND AND PERMISSIONS *
     ************************************/

    if (!hasPermissionsForCommand(interaction.member, interaction.channel, command)) {
        replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        return;
    }

    if (command.channelWhitelist && !command.channelWhitelist.includes(interaction.channelId)) {
        replyError(interaction, `This command is only usable in <#${command.channelWhitelist.join('>, <#')}>.`, 'Invalid Channel');
        return;
    }

    command.callback(interaction);
}

/************
 * REGISTER *
 ************/

export async function registerChatInputCommands(dir: string, directories: string[] = []) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await registerChatInputCommands(path.join(dir, dirEntry.name), [...directories, dirEntry.name]);
            } else if (dirEntry.name === 'callback.js') {
                const { command }: { command: ChatInputCommandCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);

                let collection = chatInputCommands;
                const superCommandNames = directories;
                const commandName = superCommandNames.pop();

                superCommandNames.forEach((superCommand) => {
                    if (!collection.get(superCommand)) collection.set(superCommand, new Collection<string, ChatInputCommandCollection | ChatInputCommandCallback>());
                    const nestedCollection = collection.get(superCommand);
                    // if check technically not needed, but better than suppressing TS errors
                    if (nestedCollection && nestedCollection instanceof Collection) collection = nestedCollection;
                });

                commandName && collection.set(commandName, command);
            }
        })
    );
}
