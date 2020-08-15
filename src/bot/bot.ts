import discord, { Collection } from 'discord.js';
import { Command, registerCommands } from './commandHandler.js';
import { Event, registerEvents } from './eventHandler.js';

export type CustomClient = discord.Client & { commands: Collection<string, Command>; events: Collection<string, Event> };

export function startBot() {
    const client: CustomClient = Object.assign(new discord.Client(), {
        commands: new Collection<string, Command>(),
        events: new Collection<string, Event>(),
    });

    client.once('ready', () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.username}#${client.user.discriminator}'.`);

        registerCommands(client, './src/bot/commands');
        registerEvents(client, './src/bot/events');
    });

    client.login(process.env.TOKEN);
}
