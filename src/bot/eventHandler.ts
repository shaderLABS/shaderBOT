import { ClientEvents } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { client, events } from './bot.js';

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
            registerEvents(path.join(dir, file));
        } else if (file.endsWith('.js')) {
            const { event }: { event: Event } = await import(path.join(filePath, file));
            console.log(`Registering event "${file}"...`);

            events.set(event.name, event);

            if (event.name === 'ready') client.once(event.name, event.callback.bind(event));
            else client.on(event.name, event.callback.bind(event));
        }
    }
}
