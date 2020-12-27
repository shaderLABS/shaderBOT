import { ClientEvents } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { client, events } from './bot.js';

export interface Event {
    name: keyof ClientEvents;
    callback: Function;
}

export async function registerEvents(dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath);
    for (const file of files) {
        const stat = await fs.lstat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerEvents(path.join(dir, file));
        } else if (file.endsWith('.js')) {
            const { event }: { event: Event } = await import(url.pathToFileURL(path.join(filePath, file)).href);
            console.log('\x1b[30m\x1b[1m%s\x1b[0m', `Registering event "${file}"...`);

            events.set(event.name, event);

            if (event.name === 'ready') client.once(event.name, event.callback.bind(event));
            else client.on(event.name, event.callback.bind(event));
        }
    }
}
