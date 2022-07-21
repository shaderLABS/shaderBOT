import fs from 'fs/promises';
import path from 'path';
import { automaticResponseStore } from './bot.js';
import { GuildMessage } from './events/message/messageCreate.js';
import { AutomaticResponse } from './lib/automaticResponse.js';

export const automaticResponsePath = 'customContent/automaticResponse';

export function handleAutomaticResponse(message: GuildMessage) {
    for (const [, automaticResponse] of automaticResponseStore) {
        if (automaticResponse.regex.test(message.content)) {
            automaticResponse.send(message);
            return true;
        }
    }

    return false;
}

export async function registerAutomaticResponses(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true }).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (!dirEntry.name.endsWith('.json')) return;

            const automaticResponse = AutomaticResponse.fromJSON(await fs.readFile(path.join(dirPath, dirEntry.name), 'utf-8'));
            automaticResponseStore.set(automaticResponse.alias, automaticResponse);
        })
    );
}
