import { Snowflake } from 'discord.js';
import fssync from 'fs';
import fsasync from 'fs/promises';

export class SettingsFile<Data> {
    public data: Data;
    public path: string;

    public async save() {
        return fsasync.writeFile(this.path, JSON.stringify(this.data, null, 4), 'utf-8');
    }

    constructor(path: string) {
        this.path = path;
        this.data = JSON.parse(fssync.readFileSync(path, 'utf-8'));
    }
}

export type BotSettings = {
    logging: {
        moderationChannelID: Snowflake;
        messageChannelID: Snowflake;
    };
    moderatorRoleID: Snowflake;
    threadRoleID?: Snowflake;
    stickyThreadChannelIDs: Snowflake[];
    appealChannelID: Snowflake;
    appealCooldown: number;
    botChannelID: Snowflake;
    mediaChannelIDs: Snowflake[];
    serverLogPaths: string[];
    guildID: Snowflake;
    archive: {
        categoryIDs: Snowflake[];
        minimumMessageCount: number;
        maximumMessageAge: number;
    };
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
    };
    raidProtection: {
        cacheLength: number;
        creationTimeThreshold: number;
        usernameSimilarityThreshold: number;
        userThreshold: number;
    };
    messageTranslation: {
        cacheLength: number;
        fetchCooldownTimeThreshold: number;
        fetchCooldownCountThreshold: number;
    };
};
