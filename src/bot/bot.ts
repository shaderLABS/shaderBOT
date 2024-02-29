import { Client, GatewayIntentBits, Partials } from 'discord.js';

import { automaticResponsePath, registerAutomaticResponses } from './automaticResponseHandler.ts';
import { registerChatInputCommands } from './chatInputCommandHandler.ts';
import { registerMessageContextMenuCommands, registerUserContextMenuCommands } from './contextMenuCommandHandler.ts';
import { registerEvents } from './eventHandler.ts';
import { Backup } from './lib/backup.ts';
import { CooldownStore } from './lib/cooldownStore.ts';
import { RandomPresence } from './lib/presence.ts';
import { SettingsFile, type BotSettings } from './lib/settings.ts';
import { TimeoutStore } from './lib/timeoutStore.ts';
import { registerModals } from './modalSubmitHandler.ts';
import { pastaPath, registerPastas } from './pastaHandler.ts';

export let client: Client;
export let cooldownStore: CooldownStore;
export let timeoutStore: TimeoutStore;
export let settings: SettingsFile<BotSettings>;

export async function startBot() {
    cooldownStore = new CooldownStore();
    timeoutStore = new TimeoutStore();
    settings = new SettingsFile<BotSettings>('customContent/settings.jsonc', 'settings.template.jsonc');

    client = new Client({
        allowedMentions: {
            parse: ['roles', 'users'],
            repliedUser: false,
        },
        partials: [Partials.Message, Partials.GuildMember],
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
        ],
        presence: RandomPresence.PRESENCE,
    });

    registerEvents('src/bot/events');
    registerChatInputCommands('src/bot/chatInputCommands');
    registerMessageContextMenuCommands('src/bot/contextMenuCommands/message');
    registerUserContextMenuCommands('src/bot/contextMenuCommands/user');
    registerModals('src/bot/modals');
    registerPastas(pastaPath);
    registerAutomaticResponses(automaticResponsePath);
    Backup.clean();

    client.login(process.env.TOKEN);
}
