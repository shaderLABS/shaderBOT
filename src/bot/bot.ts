import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import cron from 'node-cron';
import { automaticResponsePath, registerAutomaticResponses } from './automaticResponseHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import { AutomaticResponse } from './lib/automaticResponse.js';
import { cleanBackups } from './lib/backup.js';
import { rotateBanner } from './lib/banner.js';
import { CooldownStore } from './lib/cooldownStore.js';
import { Pasta } from './lib/pasta.js';
import { setRandomPresence } from './lib/presence.js';
import { loadTimeouts, TimeoutStore } from './lib/timeoutStore.js';
import { pastaPath, registerPastas } from './pastaHandler.js';
import { BotSettings, SettingsFile } from './settings/settings.js';
import { registerSlashCommands } from './slashCommandHandler.js';

export let client: Client;
export let events: Collection<string, Event>;
export let pastaStore: Collection<string, Pasta>;
export let automaticResponseStore: Collection<string, AutomaticResponse>;
export let cooldownStore: CooldownStore;
export let timeoutStore: TimeoutStore;
export let settings: SettingsFile<BotSettings>;

cron.schedule('59 23 * * *', () => {
    loadTimeouts(true);
    cleanBackups();
    rotateBanner();
    setRandomPresence();
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
    pastaStore = new Collection<string, Pasta>();
    automaticResponseStore = new Collection<string, AutomaticResponse>();
    cooldownStore = new CooldownStore();
    timeoutStore = new TimeoutStore();
    settings = new SettingsFile<BotSettings>('./src/bot/settings/settings.json');

    registerEvents('./build/bot/events');
    registerSlashCommands('./build/bot/slashCommands');
    registerPastas(pastaPath);
    registerAutomaticResponses(automaticResponsePath);
    cleanBackups();

    client.login(process.env.TOKEN);
}
