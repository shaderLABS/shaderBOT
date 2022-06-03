import fs from 'fs/promises';
import path from 'path';
import { pastaStore } from './bot.js';
import { Pasta } from './lib/pasta.js';

export const pastaPath = 'customContent/pasta';

export async function registerPastas(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true }).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (!dirEntry.name.endsWith('.json')) return;

            const pasta = Pasta.fromJSON(await fs.readFile(path.join(dirPath, dirEntry.name), 'utf-8'));
            pastaStore.set(pasta.alias, pasta);
        })
    );
}
