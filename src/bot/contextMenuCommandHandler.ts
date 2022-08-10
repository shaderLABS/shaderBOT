import { Collection, MessageContextMenuCommandInteraction, PermissionResolvable, UserContextMenuCommandInteraction } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { hasPermissionsForCommand } from './chatInputCommandHandler.js';
import { replyError } from './lib/embeds.js';

/***********
 * EXECUTE *
 ***********/

export type MessageContextMenuCommandCallback = {
    readonly commandName: string;
    readonly channelWhitelist?: string[];
    readonly requiredPermissions?: PermissionResolvable;
    readonly permissionOverwrites?: boolean;
    readonly callback: (interaction: MessageContextMenuCommandInteraction<'cached'>) => void;
};

export type UserContextMenuCommandCallback = {
    readonly commandName: string;
    readonly channelWhitelist?: string[];
    readonly requiredPermissions?: PermissionResolvable;
    readonly permissionOverwrites?: boolean;
    readonly callback: (interaction: UserContextMenuCommandInteraction<'cached'>) => void;
};

export const messageContextMenuCommands = new Collection<string, MessageContextMenuCommandCallback>();
export const userContextMenuCommands = new Collection<string, UserContextMenuCommandCallback>();

/***********
 * EXECUTE *
 ***********/

export async function handleMessageContextMenuCommand(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    const command = messageContextMenuCommands.get(interaction.commandName);
    if (!command) return;

    /************************************
     * VALIDATE COMMAND AND PERMISSIONS *
     ************************************/

    if (!hasPermissionsForCommand(interaction.member, interaction.channelId, command)) {
        return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
    }

    if (command.channelWhitelist && !command.channelWhitelist.includes(interaction.channelId)) {
        return replyError(interaction, `This command is only usable in <#${command.channelWhitelist.join('>, <#')}>.`, 'Invalid Channel');
    }

    command.callback(interaction);
}

export async function handleUserContextMenuCommand(interaction: UserContextMenuCommandInteraction<'cached'>) {
    const command = userContextMenuCommands.get(interaction.commandName);
    if (!command) return;

    /************************************
     * VALIDATE COMMAND AND PERMISSIONS *
     ************************************/

    if (!hasPermissionsForCommand(interaction.member, interaction.channelId, command)) {
        return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
    }

    if (command.channelWhitelist && !command.channelWhitelist.includes(interaction.channelId)) {
        return replyError(interaction, `This command is only usable in <#${command.channelWhitelist.join('>, <#')}>.`, 'Invalid Channel');
    }

    command.callback(interaction);
}

/************
 * REGISTER *
 ************/

export async function registerMessageContextMenuCommands(dir: string, directories: string[] = []) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await registerMessageContextMenuCommands(path.join(dir, dirEntry.name), [...directories, dirEntry.name]);
            } else if (dirEntry.name === 'callback.js') {
                const { command }: { command: MessageContextMenuCommandCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);
                messageContextMenuCommands.set(command.commandName, command);
            }
        })
    );
}

export async function registerUserContextMenuCommands(dir: string, directories: string[] = []) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await registerUserContextMenuCommands(path.join(dir, dirEntry.name), [...directories, dirEntry.name]);
            } else if (dirEntry.name === 'callback.js') {
                const { command }: { command: UserContextMenuCommandCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);
                userContextMenuCommands.set(command.commandName, command);
            }
        })
    );
}
