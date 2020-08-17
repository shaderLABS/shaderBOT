import { ClientEvents } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { client } from './bot.js';

export type Event = {
    name: keyof ClientEvents;
    callback: Function;
};

export async function registerEvents(dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath);
    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerEvents(path.join(filePath, file));
        } else if (file.endsWith('.js')) {
            const { event }: { event: Event } = await import(path.join(filePath, file));
            console.log(`Registering event "${file}"...`);

            client.events.set(event.name, event);
            client.on(event.name, event.callback.bind(event));
        }
    }
}
