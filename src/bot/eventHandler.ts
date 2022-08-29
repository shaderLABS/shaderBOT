import { Awaitable, ClientEvents, Collection, Events } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { client } from './bot.js';

type EventGeneric<K extends keyof ClientEvents> = {
    readonly name: K;
    readonly callback: (...args: ClientEvents[K]) => Awaitable<void>;
};

export type Event = { [K in keyof ClientEvents]: EventGeneric<K> }[keyof ClientEvents];

export const events = new Collection<string, Event>();

/************
 * REGISTER *
 ************/

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

                if (event.name === Events.ClientReady) {
                    client.once(event.name, event.callback);
                } else {
                    // cast callback function type to any, avoid TypeScript error "Expression produces a union type that is too complex to represent."
                    client.on(event.name, event.callback as any);
                }
            }
        })
    );
}
