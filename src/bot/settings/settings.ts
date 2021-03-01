import fs from 'fs/promises';

const settingsFile = './src/bot/settings/settings.json';

export interface Settings {
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
    warnings: {
        decay: number[];
        punishment: {
            muteRange: number[];
            muteValues: number[];
            tempbanRange: number[];
            tempbanValues: number[];
            ban: number;
        };
    };
}

export function write(data: Object) {
    fs.writeFile(settingsFile, JSON.stringify(data, null, 4), 'utf-8');
}

export async function update() {
    const { settings } = await import('../bot.js');
    fs.writeFile(settingsFile, JSON.stringify(settings, null, 4), 'utf-8');
}

export async function read() {
    return JSON.parse(await fs.readFile(settingsFile, 'utf-8'));
}
