import { Client, Collection } from 'discord.js';
import cron from 'node-cron';
import { AutoResponse, autoResponsePath, registerAutoResponses } from './autoResponseHandler.js';
import { Command, registerCommands } from './commandHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import { cleanBackups } from './lib/backup.js';
import { loadTimeouts } from './lib/punishments.js';
import { Pasta, pastaPath, registerPastas } from './pastaHandler.js';
import * as settingsFile from './settings/settings.js';

export let client: Client;
export let commands: Collection<string, Command | Collection<string, Command>>;
export let events: Collection<string, Event>;
export let pastas: Collection<string, Pasta>;
export let autoResponses: Collection<string, AutoResponse>;
export let settings: settingsFile.Settings;

cron.schedule('55 23 * * *', () => {
    loadTimeouts();
    cleanBackups();
});

export async function startBot() {
    client = new Client({ disableMentions: 'everyone', partials: ['MESSAGE', 'REACTION', 'GUILD_MEMBER'], messageEditHistoryMaxSize: 0 });
    commands = new Collection<string, Command>();
    events = new Collection<string, Event>();
    pastas = new Collection<string, Pasta>();
    autoResponses = new Collection<string, AutoResponse>();
    settings = await settingsFile.read();

    registerCommands('./src/bot/commands');
    registerEvents('./src/bot/events');
    registerPastas(pastaPath);
    registerAutoResponses(autoResponsePath);
    cleanBackups();

    client.login(process.env.TOKEN);
}
