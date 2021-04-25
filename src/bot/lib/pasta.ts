import fs from 'fs/promises';
import path from 'path';
import { Pasta, pastaPath } from '../pastaHandler.js';

export function aliasToFileName(alias: string) {
    return alias.replace(/[^a-z0-9]/gi, '_') + '.json';
}

export async function writePasta(pasta: Pasta) {
    await fs.stat(pastaPath).catch(async (error) => {
        if (error.code === 'ENOENT') await fs.mkdir(pastaPath, { recursive: true });
        else throw error;
    });

    fs.writeFile(path.join(pastaPath, aliasToFileName(pasta.alias)), JSON.stringify(pasta, null, 4));
}
