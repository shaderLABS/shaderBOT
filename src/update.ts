import { ApplicationCommandData, Client } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import * as settingsFile from './bot/settings/settings.js';

const slashCommandStructure: ApplicationCommandData[] = [];
async function stitchCommandStructure(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await stitchCommandStructure(path.join(dir, dirEntry.name));
            } else if (dirEntry.name === 'structure.json') {
                const structure = JSON.parse(await fs.readFile(path.join(dirPath, dirEntry.name), 'utf-8'));
                slashCommandStructure.push(structure);
            }
        })
    );
}

const settings: settingsFile.Settings = await settingsFile.read();
const client = new Client({
    intents: [],
});

client.on('ready', async () => {
    const guild = client.guilds.cache.get(settings.guildID);
    if (!guild) return console.error('Failed to update slash commands: the specified guild was not found.');

    await stitchCommandStructure('./src/bot/slashCommands');
    await guild.commands.set(slashCommandStructure);

    console.log('Successfully updated slash commands!');
    client.destroy();
});

client.login(process.env.TOKEN);
