import { Client, GatewayIntentBits, Partials } from 'discord.js';

import { automaticResponsePath, registerAutomaticResponses } from './automaticResponseHandler.js';
import { registerEvents } from './eventHandler.js';
import { cleanBackups } from './lib/backup.js';
import { CooldownStore } from './lib/cooldownStore.js';
import { TimeoutStore } from './lib/timeoutStore.js';
import { registerModals } from './modalSubmitHandler.js';
import { pastaPath, registerPastas } from './pastaHandler.js';
import { BotSettings, SettingsFile } from './settings/settings.js';
import { registerSlashCommands } from './slashCommandHandler.js';

export let client: Client;
export let cooldownStore: CooldownStore;
export let timeoutStore: TimeoutStore;
export let settings: SettingsFile<BotSettings>;

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
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
        ],
    });

    cooldownStore = new CooldownStore();
    timeoutStore = new TimeoutStore();
    settings = new SettingsFile<BotSettings>('./src/bot/settings/settings.json');

    registerEvents('./build/bot/events');
    registerSlashCommands('./build/bot/slashCommands');
    registerModals('./build/bot/modals');
    registerPastas(pastaPath);
    registerAutomaticResponses(automaticResponsePath);
    cleanBackups();

    client.login(process.env.TOKEN);
}
