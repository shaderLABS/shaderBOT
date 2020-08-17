import { Client, Collection } from 'discord.js';
import { Command, registerCommands } from './commandHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import mongoose from 'mongoose';
import * as settingsFile from './settings/settings.js';

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

export type CustomClient = Client & {
    commands: Collection<string, Command>;
    events: Collection<string, Event>;
};

export let client: CustomClient;
export let settings: settingsFile.Settings;

export function startBot() {
    client = Object.assign(new Client(), {
        commands: new Collection<string, Command>(),
        events: new Collection<string, Event>(),
    });

    client.once('ready', async () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.username}#${client.user.discriminator}'.`);

        settings = await settingsFile.read();

        registerCommands('./src/bot/commands');
        registerEvents('./src/bot/events');
    });

    mongoose.connection.once('open', async () => {
        console.log('Connected to MongoDB.');
    });

    client.login(process.env.TOKEN);
    mongoose.connect(process.env.MONGODB || 'mongodb://127.0.0.1/shaderBOT');
}
