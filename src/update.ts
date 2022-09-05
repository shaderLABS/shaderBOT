import { ApplicationCommandData, Client, Events } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { BotSettings, SettingsFile } from './bot/settings/settings.js';

const settings = new SettingsFile<BotSettings>('./src/bot/settings/settings.json');
const commandStructure: ApplicationCommandData[] = [];

async function stitchCommandStructure(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await stitchCommandStructure(path.join(dir, dirEntry.name));
            } else if (dirEntry.name === 'structure.js') {
                const structure: ApplicationCommandData = (await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href)).default;
                commandStructure.push(structure);
            }
        })
    );
}

if (!process.env.TOKEN) throw 'TOKEN not set.';
if (!process.env.APPLICATION_CLIENT_ID) throw 'APPLICATION_CLIENT_ID not set.';

const client = new Client({ intents: [] });

client.once(Events.ClientReady, async () => {
    const guild = client.guilds.cache.get(settings.data.guildID);

    if (!guild) {
        console.error('Failed to update slash commands: the specified guild was not found.');
        client.destroy();
        return;
    }

    await stitchCommandStructure('./build/bot/chatInputCommands');
    await stitchCommandStructure('./build/bot/contextMenuCommands');
    await guild.commands.set(commandStructure);

    console.log('Successfully updated slash commands!');
    client.destroy();
});

client.login(process.env.TOKEN);
