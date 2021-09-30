import { ApplicationCommandData, Collection, PermissionString } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { GuildCommandInteraction } from './events/interactionCreate';

export type ApplicationCommandCallback = {
    readonly cooldownDuration?: number;
    readonly channelWhitelist?: string[];
    readonly ticketChannels?: boolean;
    readonly requiredPermissions?: PermissionString[];
    readonly permissionOverwrites?: boolean;
    readonly callback: (interaction: GuildCommandInteraction) => void;
};

type SlashCommandCollection = Collection<string, SlashCommandCollection | ApplicationCommandCallback>;
export const slashCommands: SlashCommandCollection = new Collection();
export const slashCommandStructure: ApplicationCommandData[] = [];

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
            } else if (dirEntry.name === 'structure.json') {
                const structure = JSON.parse(await fs.readFile(path.join(dirPath, dirEntry.name), 'utf-8'));
                slashCommandStructure.push(structure);
            }
        })
    );
}
