import { ChannelType, Collection, Message, TextChannel, VoiceChannel, type AnyThreadChannel } from 'discord.js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function parseProperty(prop: string | undefined | null) {
    return prop ? '\n\t' + prop.replaceAll(/\r?\n|\r/g, ' ') : '';
}

export class Backup {
    public fileName: string;
    public content: string;

    public channelName: string;
    public size: string;
    public creationTime: string;

    public static readonly CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PublicThread, ChannelType.PrivateThread] as const;
    public static readonly DIRECTORY = 'customContent/channelBackup/' as const;

    constructor(data: { fileName: string; content: string }, isEncrypted: boolean) {
        this.fileName = data.fileName;
        this.content = isEncrypted ? Backup.decryptContent(data.content) : data.content;

        [this.channelName, this.creationTime, this.size] = path.parse(this.fileName).name.split(' - ');
    }

    public static async create(channel: TextChannel | AnyThreadChannel | VoiceChannel, backupMessages?: Collection<string, Message>, introduction?: string) {
        const messages = backupMessages || channel.messages.cache;
        if (!messages.size) return Promise.reject('There are no messages to create a backup of.');

        const creationTime = new Date().toUTCString();

        const messageArray = messages.values().toArray();
        if (backupMessages) messageArray.reverse();

        const content = messageArray.reduce(
            (content, message) => {
                let messageContent = `${message.author.username} (${message.author.id}) - ${message.content.replaceAll(/\r?\n|\r/g, ' ')}`;
                for (const embed of message.embeds) messageContent += (parseProperty(embed.title) + parseProperty(embed.author?.name) + parseProperty(embed.description)).trim();
                for (const attachment of message.attachments.values()) messageContent += '\n\t' + attachment.url;

                return content + `${message.createdAt.toUTCString()} - ${messageContent}\n`;
            },
            `Backup of #${channel.name} (${messages.size} messages). Created at ${creationTime}.${introduction ? '\n' + introduction : ''}\n\n`,
        );

        const backup = new Backup({ fileName: `#${channel.name} - ${creationTime} - ${messages.size}.txt`, content }, false);
        await backup.write();

        return backup;
    }

    public static async read(fileName: string) {
        const content = await Bun.file(path.join(Backup.DIRECTORY, fileName)).text();
        return new Backup({ fileName, content }, true);
    }

    public async write() {
        await Bun.write(path.join(Backup.DIRECTORY, this.fileName), Backup.encryptContent(this.content), { createPath: true });
    }

    private static decryptContent(content: string) {
        if (!process.env.BACKUP_ENCRYPTION_KEY) throw "The environment variable 'BACKUP_ENCRYPTION_KEY' is missing.";
        if (process.env.BACKUP_ENCRYPTION_KEY.length !== 32) throw "The 'BACKUP_ENCRYPTION_KEY' must be 32 characters (256 bits) long.";

        const contentParts = content.split(':');
        const rawIV = contentParts.shift();
        if (!rawIV) throw 'Failed to retrieve the IV.';

        const rawAuthTag = contentParts.pop();
        if (!rawAuthTag) throw 'Failed to retrieve the authentication tag.';

        const iv = Buffer.from(rawIV, 'hex');
        const authTag = Buffer.from(rawAuthTag, 'hex');
        const encrypted = Buffer.from(contentParts.join(':'), 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.BACKUP_ENCRYPTION_KEY), iv, { authTagLength: 16 });
        const decrypted = decipher.update(encrypted);
        decipher.setAuthTag(authTag);

        return Buffer.concat([decrypted, decipher.final()]).toString();
    }

    private static encryptContent(content: string) {
        if (!process.env.BACKUP_ENCRYPTION_KEY) throw "The environment variable 'BACKUP_ENCRYPTION_KEY' is missing.";
        if (process.env.BACKUP_ENCRYPTION_KEY.length !== 32) throw "The 'BACKUP_ENCRYPTION_KEY' must be 32 characters (256 bits) long.";

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(process.env.BACKUP_ENCRYPTION_KEY), iv, { authTagLength: 16 });
        const encrypted = cipher.update(content);

        return iv.toString('hex') + ':' + Buffer.concat([encrypted, cipher.final()]).toString('hex') + ':' + cipher.getAuthTag().toString('hex');
    }

    public static async clean() {
        console.log('Cleaning backups...');

        try {
            const backups = await fs.readdir(Backup.DIRECTORY);
            for (const backup of backups) {
                const { birthtime } = await fs.stat(path.join(Backup.DIRECTORY, backup));
                if (Date.now() - birthtime.getTime() > 2_419_200_000) {
                    // 4w = 2,419,200,000ms
                    fs.rm(path.join(Backup.DIRECTORY, backup));
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
}
