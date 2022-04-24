import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import cron from 'node-cron';
import { AutoResponse, autoResponsePath, registerAutoResponses } from './autoResponseHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import { cleanBackups } from './lib/backup.js';
import { rotateBanner } from './lib/banner.js';
import { CooldownStore } from './lib/cooldownStore.js';
import { loadTimeouts, TimeoutStore } from './lib/timeoutStore.js';
import { Pasta, pastaPath, registerPastas } from './pastaHandler.js';
import { BotSettings, SettingsFile } from './settings/settings.js';
import { registerSlashCommands } from './slashCommandHandler.js';

export let client: Client;
export let events: Collection<string, Event>;
export let pastas: Collection<string, Pasta>;
export let autoResponses: Collection<string, AutoResponse>;
export let cooldownStore: CooldownStore;
export let timeoutStore: TimeoutStore;
export let settings: SettingsFile<BotSettings>;

cron.schedule('59 23 * * *', () => {
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
        partials: [Partials.Message, Partials.Reaction, Partials.GuildMember],
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildBans,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildIntegrations,
            GatewayIntentBits.MessageContent,
        ],
    });

    events = new Collection<string, Event>();
    pastas = new Collection<string, Pasta>();
    autoResponses = new Collection<string, AutoResponse>();
    cooldownStore = new CooldownStore();
    timeoutStore = new TimeoutStore();
    settings = new SettingsFile<BotSettings>('./src/bot/settings/settings.json');

    registerEvents('./build/bot/events');
    registerSlashCommands('./build/bot/slashCommands');
    registerPastas(pastaPath);
    registerAutoResponses(autoResponsePath);
    cleanBackups();

    client.login(process.env.TOKEN);
}
