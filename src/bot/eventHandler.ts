import { ClientEvents } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { client, events } from './bot.js';

export interface Event {
    readonly name: keyof ClientEvents;
    readonly callback: Function;
}

export async function registerEvents(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                registerEvents(path.join(dir, dirEntry.name));
            } else if (dirEntry.name.endsWith('.js')) {
                const { event }: { event: Event } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);
                events.set(event.name, event);

                if (event.name === 'ready') client.once(event.name, event.callback.bind(event));
                else client.on(event.name, event.callback.bind(event));
            }
        })
    );
}
