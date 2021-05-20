import { MessageEmbedOptions } from 'discord.js';
import { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { pastas } from './bot.js';

export const pastaPath = 'customContent/pastas';

export interface Pasta {
    alias: string;
    message?: string;
    embed?: MessageEmbedOptions;
    attachments?: string[];
}

export async function registerPastas(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries: Dirent[] = await fs.readdir(dirPath, { withFileTypes: true }).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                registerPastas(path.join(dirPath, dirEntry.name));
            } else if (dirEntry.name.endsWith('.json')) {
                const pasta: Pasta = JSON.parse(await fs.readFile(path.join(dirPath, dirEntry.name), 'utf-8'));
                pastas.set(pasta.alias, pasta);
            }
        })
    );
}
