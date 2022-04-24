import { ApplicationCommandData, Client } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { BotSettings, SettingsFile } from './bot/settings/settings.js';

const slashCommandStructure: ApplicationCommandData[] = [];
async function stitchCommandStructure(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await stitchCommandStructure(path.join(dir, dirEntry.name));
            } else if (dirEntry.name === 'structure.js') {
                const structure: ApplicationCommandData = (await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href)).default;
                slashCommandStructure.push(structure);
            }
        })
    );
}

const settings = new SettingsFile<BotSettings>('./src/bot/settings/settings.json');
const client = new Client({
    intents: [],
});

client.on('ready', async () => {
    const guild = client.guilds.cache.get(settings.data.guildID);
    if (!guild) return console.error('Failed to update slash commands: the specified guild was not found.');

    await stitchCommandStructure('./build/bot/slashCommands');
    await stitchCommandStructure('./build/bot/contextMenuEntries');
    await guild.commands.set(slashCommandStructure);

    console.log('Successfully updated slash commands!');
    client.destroy();
});

client.login(process.env.TOKEN);
