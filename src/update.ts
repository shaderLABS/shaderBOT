import { REST } from '@discordjs/rest';
import { APIApplicationCommand, Routes } from 'discord-api-types/v10';
import { ApplicationCommandData, ApplicationCommandManager, PermissionResolvable, PermissionsBitField } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { BotSettings, SettingsFile } from './bot/settings/settings.js';

const settings = new SettingsFile<BotSettings>('./src/bot/settings/settings.json');
const slashCommandStructure: Omit<APIApplicationCommand, 'id' | 'application_id' | 'guild_id'>[] = [];

function structureToAPI(structure: ApplicationCommandData & { defaultMemberPermissions?: PermissionResolvable[] }) {
    return {
        // @ts-expect-error
        ...ApplicationCommandManager.transformCommand(structure),
        default_member_permissions: structure.defaultMemberPermissions === undefined ? null : new PermissionsBitField(structure.defaultMemberPermissions).toJSON(),
    };
}

async function stitchCommandStructure(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await stitchCommandStructure(path.join(dir, dirEntry.name));
            } else if (dirEntry.name === 'structure.js') {
                const structure: ApplicationCommandData = (await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href)).default;
                slashCommandStructure.push(structureToAPI(structure));
            }
        })
    );
}

await stitchCommandStructure('./build/bot/slashCommands');
await stitchCommandStructure('./build/bot/contextMenuEntries');

if (!process.env.TOKEN) throw 'TOKEN not set.';
if (!process.env.APPLICATION_CLIENT_ID) throw 'APPLICATION_CLIENT_ID not set.';

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

await rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_CLIENT_ID, settings.data.guildID), {
    body: slashCommandStructure,
});

console.log('Successfully updated slash commands!');
