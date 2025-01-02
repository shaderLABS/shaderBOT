import { Collection } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GuildMessage } from './events/message/messageCreate.ts';
import { AutomaticResponse } from './lib/automaticResponse.ts';

export const automaticResponsePath = 'customContent/automaticResponse';
export const automaticResponseStore = new Collection<string, AutomaticResponse>();

/***********
 * EXECUTE *
 ***********/

export function handleAutomaticResponse(message: GuildMessage) {
    for (const [, automaticResponse] of automaticResponseStore) {
        if (automaticResponse.regex.test(message.content)) {
            automaticResponse.send(message);
            return true;
        }
    }

    return false;
}

/************
 * REGISTER *
 ************/

export async function registerAutomaticResponses(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true }).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (!dirEntry.name.endsWith('.json')) return;

            const automaticResponse = new AutomaticResponse(await Bun.file(path.join(dirPath, dirEntry.name)).json());
            automaticResponseStore.set(automaticResponse.alias, automaticResponse);
        }),
    );
}
