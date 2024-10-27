import JSONC from 'comment-json';
import type { Snowflake } from 'discord.js';
import fs from 'node:fs';
import { getObjectInvalidProperties } from './objectManipulation.ts';

export class SettingsFile<Data> {
    public data: Data;
    public readonly path: string;

    constructor(settingsPath: string, templatePath: string) {
        const settingsData = JSONC.parse(fs.readFileSync(settingsPath, 'utf-8'));
        const templateData = JSONC.parse(fs.readFileSync(templatePath, 'utf-8'));

        const invalidProperties = getObjectInvalidProperties(settingsData, templateData);
        if (invalidProperties.length !== 0) {
            console.error(Bun.inspect.table(invalidProperties));
            throw new Error(`Invalid properties found in ${settingsPath}.`);
        }

        this.data = settingsData as Data;
        this.path = settingsPath;
    }

    public async save() {
        return Bun.write(this.path, JSONC.stringify(this.data, null, '\t'));
    }
}

export type BotSettings = {
    logging: {
        moderationChannelID: Snowflake;
        messageChannelID: Snowflake;
        announcementChannelID: Snowflake;
    };
    moderatorRoleID: Snowflake;
    threadRoleID: Snowflake;
    stickyThreadChannelIDs: Snowflake[];
    appealChannelID: Snowflake;
    appealCooldown: number;
    botChannelID: Snowflake;
    mediaChannelIDs: Snowflake[];
    serverLogPaths: string[];
    randomCustomStatuses: string[];
    guildID: Snowflake;
    archive: {
        categoryIDs: Snowflake[];
        minimumMessageCount: number;
        maximumMessageAge: number;
    };
    warnings: {
        decay: number[];
        decay_minimum: number;
        punishment: {
            muteRange: number[];
            muteValues: number[];
            tempbanRange: number[];
            tempbanValues: number[];
            ban: number;
        };
    };
    blacklist: {
        strings: string[];
        muteDuration: number;
    };
    spamProtection: {
        cacheLength: number;
        characterThreshold: number;
        muteDuration: number;
        messageThreshold: number;
        timeThreshold: number;
        similarityThreshold: number;
        inviteURL: string;
    };
    raidProtection: {
        cacheLength: number;
        creationTimeThreshold: number;
        usernameSimilarityThreshold: number;
        userThreshold: number;
        appealURL: string;
    };
    messageTranslation: {
        cacheLength: number;
        fetchCooldownTimeThreshold: number;
        fetchCooldownCountThreshold: number;
    };
};
