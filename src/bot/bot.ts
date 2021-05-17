import { Client, Collection } from 'discord.js';
import cron from 'node-cron';
import { AutoResponse, autoResponsePath, registerAutoResponses } from './autoResponseHandler.js';
import { Command, commandsToDebugMessage, registerCommands } from './commandHandler.js';
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
export let cooldowns: Map<string, boolean>;
export let settings: settingsFile.Settings;

cron.schedule('55 23 * * *', () => {
    loadTimeouts();
    cleanBackups();
});

export async function startBot() {
    client = new Client({
        disableMentions: 'everyone',
        partials: ['MESSAGE', 'REACTION', 'GUILD_MEMBER'],
        messageEditHistoryMaxSize: 0,
        ws: { intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'] },
    });

    commands = new Collection<string, Command>();
    events = new Collection<string, Event>();
    pastas = new Collection<string, Pasta>();
    autoResponses = new Collection<string, AutoResponse>();
    cooldowns = new Map<string, boolean>();
    settings = await settingsFile.read();

    registerCommands('./src/bot/commands').then(() => console.debug(`Registered Commands:\n\t${commandsToDebugMessage(commands)}`));
    registerEvents('./src/bot/events').then(() => console.debug(`Registered Events:\n\t${events.keyArray().join('\n\t')}`));
    registerPastas(pastaPath).then(() => console.debug(`Registered Pastas:\n\t${pastas.keyArray().join('\n\t')}`));
    registerAutoResponses(autoResponsePath).then(() => console.debug(`Registered Automatic Responses:\n\t${autoResponses.keyArray().join('\n\t')}`));
    cleanBackups();

    client.login(process.env.TOKEN);
}
