import { Client, Events, type ApplicationCommandData } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { SettingsFile, type BotSettings } from './bot/lib/settings.ts';

const settings = new SettingsFile<BotSettings>('customContent/settings.jsonc', 'settings.template.jsonc');
const commandStructure: ApplicationCommandData[] = [];

async function stitchCommandStructure(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await stitchCommandStructure(path.join(dir, dirEntry.name));
            } else if (dirEntry.name === 'structure.ts') {
                const structure: ApplicationCommandData = (await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href)).default;
                commandStructure.push(structure);
            }
        }),
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

    await stitchCommandStructure('src/bot/chatInputCommands');
    const chatInputCommandAmount = commandStructure.length;
    console.log(`Stitched ${chatInputCommandAmount} chat input commands...`);

    await stitchCommandStructure('src/bot/contextMenuCommands');
    const contextMenuCommandAmount = commandStructure.length - chatInputCommandAmount;
    console.log(`Stitched ${contextMenuCommandAmount} context menu commands...`);

    await guild.commands.set(commandStructure);
    console.log('Updated application commands!');

    client.destroy();
});

client.login(process.env.TOKEN);
