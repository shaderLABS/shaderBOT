import { Client, Collection } from 'discord.js';
import cron from 'node-cron';
import { db } from '../db/postgres.js';
import { Command, registerCommands } from './commandHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import { loadTimeouts } from './lib/punishments.js';
import * as settingsFile from './settings/settings.js';

export let client: Client;
export let commands: Collection<string, Command | Collection<string, Command>>;
export let events: Collection<string, Event>;
export let settings: settingsFile.Settings;

cron.schedule('55 23 * * *', () => {
    loadTimeouts();
    db.query(/*sql*/ `SELECT expire_warns();`);
});

export async function startBot() {
    client = new Client({ disableMentions: 'everyone', partials: ['MESSAGE', 'REACTION', 'GUILD_MEMBER'] });
    commands = new Collection<string, Command>();
    events = new Collection<string, Event>();
    settings = await settingsFile.read();

    registerCommands('./src/bot/commands');
    registerEvents('./src/bot/events');

    client.login(process.env.TOKEN);
}
