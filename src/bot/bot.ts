import { Client, GatewayIntentBits, Partials } from 'discord.js';

import { automaticResponsePath, registerAutomaticResponses } from './automaticResponseHandler.js';
import { registerChatInputCommands } from './chatInputCommandHandler.js';
import { registerMessageContextMenuCommands, registerUserContextMenuCommands } from './contextMenuCommandHandler.js';
import { registerEvents } from './eventHandler.js';
import { Backup } from './lib/backup.js';
import { CooldownStore } from './lib/cooldownStore.js';
import { RandomPresence } from './lib/presence.js';
import { BotSettings, SettingsFile } from './lib/settings.js';
import { TimeoutStore } from './lib/timeoutStore.js';
import { registerModals } from './modalSubmitHandler.js';
import { pastaPath, registerPastas } from './pastaHandler.js';

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
        partials: [Partials.Message, Partials.GuildMember],
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildBans,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
        ],
        presence: RandomPresence.PRESENCE,
    });

    cooldownStore = new CooldownStore();
    timeoutStore = new TimeoutStore();
    settings = new SettingsFile<BotSettings>('customContent/settings.jsonc', 'settings.template.jsonc');

    registerEvents('build/bot/events');
    registerChatInputCommands('build/bot/chatInputCommands');
    registerMessageContextMenuCommands('build/bot/contextMenuCommands/message');
    registerUserContextMenuCommands('build/bot/contextMenuCommands/user');
    registerModals('build/bot/modals');
    registerPastas(pastaPath);
    registerAutomaticResponses(automaticResponsePath);
    Backup.clean();

    client.login(process.env.TOKEN);
}
