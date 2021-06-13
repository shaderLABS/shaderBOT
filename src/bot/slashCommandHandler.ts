import { ApplicationCommandData, ApplicationCommandPermissionData, Collection, CommandInteraction } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';

export type ApplicationCommandCallback = {
    callback: (interaction: CommandInteraction) => void;
};

type SlashCommandCollection = Collection<string, SlashCommandCollection | ApplicationCommandCallback>;
export const slashCommands: SlashCommandCollection = new Collection();
export const slashCommandStructure: (ApplicationCommandData & { permissions: ApplicationCommandPermissionData[] })[] = [];

export async function registerSlashCommands(dir: string, directories: string[] = []) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                registerSlashCommands(path.join(dir, dirEntry.name), [...directories, dirEntry.name]);
            } else if (dirEntry.name.endsWith('.js')) {
                const { command }: { command: ApplicationCommandCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);

                let collection = slashCommands;
                const [commandName, ...superCommandNames] = directories;

                superCommandNames.forEach((superCommand) => {
                    if (!collection.has(superCommand)) collection.set(superCommand, new Collection<string, SlashCommandCollection | ApplicationCommandCallback>());
                    const current = collection.get(superCommand);
                    if (current && current instanceof Collection) collection = current;
                });

                collection.set(commandName, command);
            } else if (dirEntry.name === 'structure.json') {
                const structure = JSON.parse(await fs.readFile(path.join(dirPath, dirEntry.name), 'utf-8'));
                slashCommandStructure.push(structure);
            }
        })
    );
}
