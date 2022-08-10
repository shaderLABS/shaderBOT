import { AnyThreadChannel, ChannelType, ChatInputCommandInteraction, Collection, GuildMember, PermissionResolvable, TextChannel, VoiceChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { MessageContextMenuCommandCallback, UserContextMenuCommandCallback } from './contextMenuCommandHandler.js';
import { replyError } from './lib/embeds.js';

export type ApplicationCommandCallback = {
    readonly channelWhitelist?: string[];
    readonly requiredPermissions?: PermissionResolvable;
    readonly permissionOverwrites?: boolean;
    readonly callback: (interaction: GuildCommandInteraction) => void;
};

type SlashCommandCollection = Collection<string, SlashCommandCollection | ApplicationCommandCallback>;
export const slashCommands: SlashCommandCollection = new Collection();

export type GuildCommandInteraction = ChatInputCommandInteraction<'cached'> & {
    channel: TextChannel | AnyThreadChannel | VoiceChannel;
};

/***********
 * EXECUTE *
 ***********/

function isGuildInteraction(interaction: ChatInputCommandInteraction<'cached'>): interaction is GuildCommandInteraction {
    return !!interaction.channel && (interaction.channel.type === ChannelType.GuildText || interaction.channel.type === ChannelType.GuildVoice || interaction.channel.isThread());
}

export function hasPermissionsForCommand(
    member: GuildMember,
    channel: TextChannel | AnyThreadChannel | VoiceChannel | string,
    command: ApplicationCommandCallback | MessageContextMenuCommandCallback | UserContextMenuCommandCallback
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
    if (!isGuildInteraction(interaction)) return;

    let command = slashCommands.get(interaction.commandName);
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
        return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
    }

    if (command.channelWhitelist && !command.channelWhitelist.includes(interaction.channel.id)) {
        return replyError(interaction, `This command is only usable in <#${command.channelWhitelist.join('>, <#')}>.`, 'Invalid Channel');
    }

    command.callback(interaction);
}

/************
 * REGISTER *
 ************/

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
