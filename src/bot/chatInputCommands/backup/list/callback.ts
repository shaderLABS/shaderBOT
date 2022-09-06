import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SelectMenuBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { backupPath, readBackup } from '../../../lib/backup.js';
import { replyError, replyInfo, sendError } from '../../../lib/embeds.js';
import { formatTimeDateString } from '../../../lib/time.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        // read backup dir & sort by creation time
        const files: string[] = await fs.readdir(backupPath).catch((error) => {
            if (error.code !== 'ENOENT') console.error(error);
            return [];
        });

        if (files.length === 0) return replyInfo(interaction, 'There are no backups.');

        const backups = (
            await Promise.all(
                files.map(async (name) => {
                    return { name, createdAt: (await fs.stat(path.join(backupPath, name))).birthtime.getTime() };
                })
            )
        ).sort((a, b) => b.createdAt - a.createdAt);

        const backupChunks: { name: string; createdAt: number }[][] = [];
        for (let i = 0; i < Math.ceil(backups.length / 25); ++i) {
            backupChunks.push(backups.slice(25 * i, 25 * (i + 1)));
        }

        const menu = backupChunks.map(
            (chunk, index) =>
                new SelectMenuBuilder({
                    customId: 'select-backup',
                    placeholder: `${backups.length} backups available. Page ${index + 1} out of ${backupChunks.length}.`,
                    options: chunk.map((backup, index) => {
                        return {
                            label: backup.name.substring(0, backup.name.lastIndexOf(' - ')),
                            value: index.toString(),
                            emoji: { name: '📝' },
                            description: formatTimeDateString(new Date(backup.createdAt)),
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

        const components = [new ActionRowBuilder<SelectMenuBuilder>({ components: [menu[0]] })];
        if (backupChunks.length > 1) components.push(new ActionRowBuilder<SelectMenuBuilder>({ components: [backwardButton, forwardButton] }));

        const selectionMessage = await interaction.reply({ content: '**Select a Backup**', components, fetchReply: true });

        const collector = selectionMessage.createMessageComponentCollector({
            filter: (messageInteraction) => {
                if (messageInteraction.user.id === interaction.user.id) return true;

                replyError(messageInteraction, undefined, 'Insufficient Permissions');
                return false;
            },
            idle: 300000,
        });

        let index = 0;
        collector.on('collect', async (messageInteraction) => {
            if (messageInteraction.isButton()) {
                if (messageInteraction.customId === 'backward') --index;
                else if (messageInteraction.customId === 'forward') ++index;

                messageInteraction.update({
                    components: [
                        new ActionRowBuilder<SelectMenuBuilder>({ components: [menu[index]] }),
                        new ActionRowBuilder<SelectMenuBuilder>({ components: [backwardButton.setDisabled(!backupChunks[index - 1]), forwardButton.setDisabled(!backupChunks[index + 1])] }),
                    ],
                });
            } else if (messageInteraction.isSelectMenu()) {
                const backup = backupChunks[index][+messageInteraction.values[0]];

                try {
                    const data = await readBackup(backup.name);
                    interaction.channel.send({ files: [new AttachmentBuilder(Buffer.from(data), { name: backup.name })] });
                } catch (error) {
                    sendError(interaction.channel, error);
                }

                messageInteraction.update({ components: [new ActionRowBuilder<SelectMenuBuilder>({ components: [menu[index].setPlaceholder(backup.name).setDisabled(true)] })] });
                collector.stop('selected');
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'selected') selectionMessage.edit({ components: [new ActionRowBuilder<SelectMenuBuilder>({ components: [menu[index].setDisabled(true)] })] });
        });
    },
};
