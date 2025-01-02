import { Collection } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Pasta } from './lib/pasta.ts';

export const pastaPath = 'customContent/pasta';
export const pastaStore = new Collection<string, Pasta>();

/************
 * REGISTER *
 ************/

export async function registerPastas(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true }).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (!dirEntry.name.endsWith('.json')) return;

            const pasta = new Pasta(await Bun.file(path.join(dirPath, dirEntry.name)).json());
            pastaStore.set(pasta.alias, pasta);
        }),
    );
}
