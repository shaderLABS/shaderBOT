import { Collection, Events, type Awaitable, type ClientEvents } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { client } from './bot.ts';

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
            } else if (dirEntry.name.endsWith('.ts')) {
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
