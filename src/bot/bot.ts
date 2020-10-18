import { Client, Collection } from 'discord.js';
import { Command, registerCommands } from './commandHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import { loadMuteTimeouts } from './lib/mute.js';
import cron from 'node-cron';
import * as settingsFile from './settings/settings.js';

export let client: Client;
export let commands: Collection<string, Command | Collection<string, Command>>;
export let events: Collection<string, Event>;
export let settings: settingsFile.Settings;

cron.schedule('55 23 * * *', () => {
    loadMuteTimeouts();
});

export async function startBot() {
    client = new Client({ disableMentions: 'everyone', partials: ['MESSAGE', 'REACTION'] });
    commands = new Collection<string, Command>();
    events = new Collection<string, Event>();
    settings = await settingsFile.read();

    registerCommands('./src/bot/commands');
    registerEvents('./src/bot/events');

    client.login(process.env.TOKEN);
}
