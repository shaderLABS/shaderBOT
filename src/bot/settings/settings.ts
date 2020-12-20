import fs from 'fs/promises';
import path from 'path';

const settingsFile = path.join(path.resolve(), '/src/bot/settings/settings.json');

export type Settings = {
    prefix: string;
    logging: {
        channelID: string;
    };
    ticket: {
        categoryIDs: string[];
        managementChannelID: string;
        subscriptionChannelID: string;
        attachmentCacheChannelID: string;
    };
    mediaChannelIDs: string[];
    muteRoleID: string;
    guildID: string;
};

export function write(data: Object) {
    fs.writeFile(settingsFile, JSON.stringify(data, null, 2), 'utf-8');
}

export async function update() {
    const { settings } = await import('../bot.js');
    fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
}

export async function read() {
    return JSON.parse(await fs.readFile(settingsFile, 'utf-8'));
}
