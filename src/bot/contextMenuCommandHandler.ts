import { Collection, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction, type PermissionResolvable } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { hasPermissionsForCommand } from './chatInputCommandHandler.ts';
import { replyError } from './lib/embeds.ts';

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

const messageContextMenuCommands = new Collection<string, MessageContextMenuCommandCallback>();
const userContextMenuCommands = new Collection<string, UserContextMenuCommandCallback>();

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
        replyError(interaction, {
            description: 'You do not have permission to run this command.',
            title: 'Insufficient Permissions',
        });
        return;
    }

    if (command.channelWhitelist && !command.channelWhitelist.includes(interaction.channelId)) {
        replyError(interaction, {
            description: `This command is only usable in <#${command.channelWhitelist.join('>, <#')}>.`,
            title: 'Invalid Channel',
        });
        return;
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
        replyError(interaction, {
            description: 'You do not have permission to run this command.',
            title: 'Insufficient Permissions',
        });
        return;
    }

    if (command.channelWhitelist && !command.channelWhitelist.includes(interaction.channelId)) {
        replyError(interaction, {
            description: `This command is only usable in <#${command.channelWhitelist.join('>, <#')}>.`,
            title: 'Invalid Channel',
        });
        return;
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
            } else if (dirEntry.name === 'callback.ts') {
                const { command }: { command: MessageContextMenuCommandCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);
                messageContextMenuCommands.set(command.commandName, command);
            }
        }),
    );
}

export async function registerUserContextMenuCommands(dir: string, directories: string[] = []) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await registerUserContextMenuCommands(path.join(dir, dirEntry.name), [...directories, dirEntry.name]);
            } else if (dirEntry.name === 'callback.ts') {
                const { command }: { command: UserContextMenuCommandCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);
                userContextMenuCommands.set(command.commandName, command);
            }
        }),
    );
}
