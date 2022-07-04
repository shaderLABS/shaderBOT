import crypto from 'crypto';
import { AnyThreadChannel, Collection, Message, TextChannel, VoiceChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

export const backupPath = 'customContent/channelBackup/';

function parseProperty(prop: string | undefined | null) {
    return prop ? '\n\t' + prop.replaceAll(/\r?\n|\r/g, ' ') : '';
}

function encryptBackup(content: string) {
    if (!process.env.BACKUP_ENCRYPTION_KEY) throw "The environment variable 'BACKUP_ENCRYPTION_KEY' is missing.";
    if (process.env.BACKUP_ENCRYPTION_KEY.length !== 32) throw "The 'BACKUP_ENCRYPTION_KEY' must be 32 characters (256 bits) long.";

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('chacha20-poly1305', Buffer.from(process.env.BACKUP_ENCRYPTION_KEY), iv, { authTagLength: 16 });
    const encrypted = cipher.update(content);

    return iv.toString('hex') + ':' + Buffer.concat([encrypted, cipher.final()]).toString('hex') + ':' + cipher.getAuthTag().toString('hex');
}

function decryptBackup(content: string) {
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

    const decipher = crypto.createDecipheriv('chacha20-poly1305', Buffer.from(process.env.BACKUP_ENCRYPTION_KEY), iv, { authTagLength: 16 });
    const decrypted = decipher.update(encrypted);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decrypted, decipher.final()]).toString();
}

async function writeBackup(name: string, content: string) {
    await fs.stat(backupPath).catch(async (error) => {
        if (error.code === 'ENOENT') await fs.mkdir(backupPath, { recursive: true });
        else throw error;
    });

    fs.writeFile(backupPath + name + '.txt', encryptBackup(content));
}

export async function readBackup(name: string) {
    const file = await fs.readFile(path.join(backupPath, name));
    return decryptBackup(file.toString());
}

export async function createBackup(channel: TextChannel | AnyThreadChannel | VoiceChannel, backupMessages?: Collection<string, Message>, backupPrefix?: string) {
    const messages = backupMessages || channel.messages.cache;
    if (!messages.size) return Promise.reject('There are no messages to create a backup of.');
    const creationTime = new Date().toUTCString();

    const messageArray = [...messages.values()];
    if (backupMessages) messageArray.reverse();

    let content = messageArray.reduce((prev, curr) => {
        let content = `${curr.author.tag} (${curr.author.id}) - ${curr.content.replaceAll(/\r?\n|\r/g, ' ')}`;
        for (const embed of curr.embeds) content += (parseProperty(embed.title) + parseProperty(embed.author?.name) + parseProperty(embed.description)).trim();
        for (const attachment of curr.attachments.values()) content += '\n\t' + attachment.url;

        return prev + `${curr.createdAt.toUTCString()} - ${content}\n`;
    }, `Backup of #${channel.name} (${messages.size} messages). Created at ${creationTime}.${backupPrefix ? '\n' + backupPrefix : ''}\n\n`);

    await writeBackup(`#${channel.name} - ${creationTime}`, content);
    return messages.size;
}

export async function cleanBackups() {
    console.log('Cleaning backups...');

    try {
        const backups = await fs.readdir(backupPath);
        for (const backup of backups) {
            const { birthtime } = await fs.stat(path.join(backupPath, backup));
            if (Date.now() - birthtime.getTime() > 2419200000) {
                // 4 weeks
                fs.rm(path.join(backupPath, backup));
            }
        }
    } catch (error) {
        console.error(error);
    }
}
