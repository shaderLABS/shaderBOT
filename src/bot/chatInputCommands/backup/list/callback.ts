import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, StringSelectMenuBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { Backup } from '../../../lib/backup.js';
import { replyError, replyInfo, sendError } from '../../../lib/embeds.js';
import { formatTimeDateString } from '../../../lib/time.js';

type BackupEntry = {
    fileName: string;
    channel: string;
    size: string;
    creationTime: Date;
};

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const files: string[] = await fs.readdir(Backup.DIRECTORY).catch((error) => {
            if (error.code !== 'ENOENT') console.error(error);
            return [];
        });

        if (files.length === 0) {
            replyInfo(interaction, 'There are no backups.');
            return;
        }

        const backupEntries: BackupEntry[] = files
            .map((fileName) => {
                const [channel, creationTime, size] = path.parse(fileName).name.split(' - ');
                return { fileName, channel, size, creationTime: new Date(creationTime) };
            })
            .sort((a, b) => b.creationTime.getTime() - a.creationTime.getTime());

        const backupEntryChunks: BackupEntry[][] = [];
        for (let i = 0; i < Math.ceil(backupEntries.length / 25); ++i) {
            backupEntryChunks.push(backupEntries.slice(25 * i, 25 * (i + 1)));
        }

        const menu = backupEntryChunks.map(
            (chunk, index) =>
                new StringSelectMenuBuilder({
                    customId: 'select-backup',
                    placeholder: `${backupEntries.length} backups available. Page ${index + 1} out of ${backupEntryChunks.length}.`,
                    options: chunk.map((backupEntry, index) => {
                        return {
                            label: `${backupEntry.channel} - ${backupEntry.size} MSG`,
                            value: index.toString(),
                            emoji: { name: '🗒️' },
                            description: formatTimeDateString(backupEntry.creationTime),
                        };
                    }),
                })
        );

        const backwardButton = new ButtonBuilder({
            customId: 'backward',
            style: ButtonStyle.Secondary,
            emoji: { name: '⬅️' },
            disabled: true,
        });

        const forwardButton = new ButtonBuilder({
            customId: 'forward',
            style: ButtonStyle.Secondary,
            emoji: { name: '➡️' },
        });

        const components = [new ActionRowBuilder<StringSelectMenuBuilder>({ components: [menu[0]] })];
        if (backupEntryChunks.length > 1) components.push(new ActionRowBuilder<StringSelectMenuBuilder>({ components: [backwardButton, forwardButton] }));

        const selectionMessage = await interaction.reply({ content: '**Select a Backup**', components, fetchReply: true });

        const collector = selectionMessage.createMessageComponentCollector({
            filter: (messageInteraction) => {
                if (messageInteraction.user.id === interaction.user.id) return true;

                replyError(messageInteraction, undefined, 'Insufficient Permissions');
                return false;
            },
            idle: 300_000, // 5min = 300,000ms
        });

        let index = 0;
        collector.on('collect', async (messageInteraction) => {
            if (messageInteraction.isButton()) {
                if (messageInteraction.customId === 'backward') --index;
                else if (messageInteraction.customId === 'forward') ++index;

                messageInteraction.update({
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>({ components: [menu[index]] }),
                        new ActionRowBuilder<StringSelectMenuBuilder>({
                            components: [backwardButton.setDisabled(!backupEntryChunks[index - 1]), forwardButton.setDisabled(!backupEntryChunks[index + 1])],
                        }),
                    ],
                });
            } else if (messageInteraction.isStringSelectMenu()) {
                const backupEntry = backupEntryChunks[index][Number(messageInteraction.values[0])];

                try {
                    const backup = await Backup.read(backupEntry.fileName);
                    interaction.channel.send({ files: [new AttachmentBuilder(Buffer.from(backup.content), { name: backup.fileName })] });
                } catch (error) {
                    sendError(interaction.channel, String(error));
                }

                messageInteraction.update({
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>({
                            components: [menu[index].setPlaceholder(`${backupEntry.channel} - ${backupEntry.size} MSG - ${formatTimeDateString(backupEntry.creationTime)}`).setDisabled(true)],
                        }),
                    ],
                });
                collector.stop('selected');
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'selected') {
                selectionMessage.edit({ components: [new ActionRowBuilder<StringSelectMenuBuilder>({ components: [menu[index].setDisabled(true)] })] }).catch(() => undefined);
            }
        });
    },
};
