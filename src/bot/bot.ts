import { Client, Collection } from 'discord.js';
import { Command, registerCommands } from './commandHandler.js';
import { Event, registerEvents } from './eventHandler.js';

import mongoose from 'mongoose';
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

export type Database = {
    tickets: mongoose.Connection;
    settings: mongoose.Connection;
};

export type CustomClient = Client & {
    commands: Collection<string, Command>;
    events: Collection<string, Event>;
    db: Database;
};

export async function startBot() {
    const client: CustomClient = Object.assign(new Client(), {
        commands: new Collection<string, Command>(),
        events: new Collection<string, Event>(),
        db: {
            tickets: await mongoose.createConnection('mongodb://127.0.0.1/tickets'),
            settings: await mongoose.createConnection('mongodb://127.0.0.1/settings'),
        },
    });

    client.once('ready', () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.username}#${client.user.discriminator}'.`);

        registerCommands(client, './src/bot/commands');
        registerEvents(client, './src/bot/events');
    });

    client.login(process.env.TOKEN);
}
