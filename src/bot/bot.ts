import { Client, Collection } from 'discord.js';
import { Command, registerCommands } from './commandHandler.js';
import { Event, registerEvents } from './eventHandler.js';
import mongoose from 'mongoose';
import * as settingsFile from './settings/settings.js';

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

// type Commands = Collection<string, Command | Commands>;

export let client: Client;
export let commands: Collection<string, Command | Collection<string, Command>>;
export let events: Collection<string, Event>;
export let settings: settingsFile.Settings;

export async function startBot() {
    client = new Client({ disableMentions: 'everyone', partials: ['MESSAGE', 'REACTION'] });
    commands = new Collection<string, Command>();
    events = new Collection<string, Event>();
    settings = await settingsFile.read();

    registerCommands('./src/bot/commands');
    registerEvents('./src/bot/events');

    mongoose.connection.once('open', async () => {
        console.log('Connected to MongoDB.');
    });

    client.login(process.env.TOKEN);
    mongoose.connect(process.env.MONGODB || 'mongodb://127.0.0.1/shaderBOT');
}
