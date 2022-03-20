import { Client, Collection, Intents } from 'discord.js';
import cron from 'node-cron';
import { AutoResponse, autoResponsePath, registerAutoResponses } from './autoResponseHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import { cleanBackups } from './lib/backup.js';
import { rotateBanner } from './lib/banner.js';
import { loadTimeouts } from './lib/punishments.js';
import { Pasta, pastaPath, registerPastas } from './pastaHandler.js';
import * as settingsFile from './settings/settings.js';
import { registerSlashCommands } from './slashCommandHandler.js';

export let client: Client;
export let events: Collection<string, Event>;
export let pastas: Collection<string, Pasta>;
export let autoResponses: Collection<string, AutoResponse>;
export let cooldowns: Map<string, boolean>;
export let settings: settingsFile.Settings;

cron.schedule('55 23 * * *', () => {
    loadTimeouts(true);
    cleanBackups();
    rotateBanner();
});

export async function startBot() {
    client = new Client({
        allowedMentions: {
            parse: ['roles', 'users'],
            repliedUser: false,
        },
        partials: ['MESSAGE', 'REACTION', 'GUILD_MEMBER'],
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILD_BANS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            Intents.FLAGS.DIRECT_MESSAGES,
            Intents.FLAGS.GUILD_INTEGRATIONS,
        ],
    });

    events = new Collection<string, Event>();
    pastas = new Collection<string, Pasta>();
    autoResponses = new Collection<string, AutoResponse>();
    cooldowns = new Map<string, boolean>();
    settings = await settingsFile.read();

    registerEvents('./build/bot/events');
    registerSlashCommands('./build/bot/slashCommands');
    registerPastas(pastaPath);
    registerAutoResponses(autoResponsePath);
    cleanBackups();

    client.login(process.env.TOKEN);
}
