import { MessageAttachment } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { Command } from '../../commandHandler.js';
import { backupPath, readBackup } from '../../lib/backup.js';
import { sendError, sendInfo } from '../../lib/embeds.js';

export const command: Command = {
    commands: ['list'],
    superCommands: ['backup'],
    help: 'List all local backups or decrypt & send a specific one.',
    expectedArgs: '[index]',
    minArgs: 0,
    maxArgs: 1,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args) => {
        const { channel } = message;

        // read backup dir & sort by creation time
        const files: string[] = await fs.readdir(backupPath).catch((error) => {
            if (error.code !== 'ENOENT') console.error(error);
            return [];
        });

        if (files.length === 0) return sendInfo(channel, 'There are no backups.');

        const backups = (
            await Promise.all(
                files.map(async (name) => {
                    return { name, createdAt: (await fs.stat(path.join(backupPath, name))).birthtime.getTime() };
                })
            )
        ).sort((a, b) => b.createdAt - a.createdAt);

        if (!args[0]) {
            const content = backups.reduce((prev, curr, i) => {
                return prev + `\`${i + 1}\` - ${curr.name}\n`;
            }, '');

            sendInfo(channel, content, 'Backups');
        } else {
            const index = +args[0];
            if (index < 1 || index > backups.length) return sendError(channel, 'Index out of bounds.');
            const backup = backups[index - 1];

            try {
                const data = await readBackup(backup.name);
                channel.send({ files: [new MessageAttachment(Buffer.from(data), backup.name)] });
            } catch (error) {
                sendError(channel, error);
            }
        }
    },
};
