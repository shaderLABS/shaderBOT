import { MessageEmbedOptions } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { pastas } from './bot.js';

export const pastaPath = 'customContent/pastas';

export interface Pasta {
    readonly alias: string;
    readonly message?: string;
    readonly embed?: MessageEmbedOptions;
}

export async function registerPastas(dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    for (const file of files) {
        const stat = await fs.stat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerPastas(path.join(dir, file));
        } else if (file.endsWith('.json')) {
            const pasta: Pasta = JSON.parse(await fs.readFile(path.join(filePath, file), 'utf-8'));

            console.debug('\x1b[30m\x1b[1m%s\x1b[0m', `Registering pasta "${file}"...`);
            pastas.set(pasta.alias, pasta);
        }
    }
}
