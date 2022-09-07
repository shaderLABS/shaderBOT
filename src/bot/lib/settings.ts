import JSONC from 'comment-json';
import { Console } from 'console';
import { Snowflake } from 'discord.js';
import fssync from 'fs';
import fsasync from 'fs/promises';

export class SettingsFile<Data> {
    public data: Data;
    public readonly path: string;

    constructor(settingsPath: string, templatePath: string) {
        const settingsData = JSONC.parse(fssync.readFileSync(settingsPath, 'utf-8'));
        const templateData = JSONC.parse(fssync.readFileSync(templatePath, 'utf-8'));

        const invalidProperties = SettingsFile.getInvalidProperties(settingsData, templateData);
        if (invalidProperties.length !== 0) {
            new Console(process.stderr).table(invalidProperties);
            throw new Error(`Invalid properties found in ${settingsPath}.`);
        }

        this.data = settingsData as Data;
        this.path = settingsPath;
    }

    private static getInvalidProperties<T>(settings: T, template: T, keyPath: string = '') {
        const invalidProperties: { key: string; expected: string; received: string }[] = [];

        for (const key in template) {
            const templateValue = template[key];
            const settingsValue = settings[key];

            const templateType = Object.prototype.toString.call(templateValue);
            const settingsType = Object.prototype.toString.call(settingsValue);

            if (templateType !== settingsType) {
                invalidProperties.push({ key: keyPath + key, expected: templateType.slice(8, -1), received: settingsType.slice(8, -1) });
            } else if (templateValue && typeof templateValue === 'object') {
                invalidProperties.push(...SettingsFile.getInvalidProperties(settingsValue, templateValue, keyPath + key + '.'));
            }
        }

        return invalidProperties;
    }

    public async save() {
        return fsasync.writeFile(this.path, JSONC.stringify(this.data, null, '\t'), 'utf-8');
    }
}

export type BotSettings = {
    logging: {
        moderationChannelID: Snowflake;
        messageChannelID: Snowflake;
    };
    moderatorRoleID: Snowflake;
    threadRoleID: Snowflake;
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
