import { Message, MessageActionRow, MessageAttachment, MessageButton, MessageSelectMenu } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { backupPath, readBackup } from '../../../lib/backup.js';
import { replyInfo, sendError } from '../../../lib/embeds.js';
import { formatTimeDate } from '../../../lib/time.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (interaction: GuildCommandInteraction) => {
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
                new MessageSelectMenu({
                    customId: 'select-backup',
                    placeholder: `${backups.length} backups available. Page ${index + 1} out of ${backupChunks.length}.`,
                    options: chunk.map((backup, index) => {
                        return {
                            label: backup.name.substring(0, backup.name.lastIndexOf(' - ')),
                            value: index.toString(),
                            emoji: '📝',
                            description: formatTimeDate(new Date(backup.createdAt)),
                        };
                    }),
                })
        );

        const backwardButton = new MessageButton({
            customId: 'backward',
            style: 'SECONDARY',
            emoji: '⬅️',
            disabled: true,
        });

        const forwardButton = new MessageButton({
            customId: 'forward',
            style: 'SECONDARY',
            emoji: '➡️',
        });

        const components = [new MessageActionRow({ components: [menu[0]] })];
        if (backupChunks.length > 1) components.push(new MessageActionRow({ components: [backwardButton, forwardButton] }));

        await interaction.reply({ content: '**Select a Backup**', components });
        const selectionMessage = await interaction.fetchReply();
        if (!(selectionMessage instanceof Message)) return;

        const collector = selectionMessage.createMessageComponentCollector({
            filter: (messageInteraction) => messageInteraction.user.id === interaction.user.id,
            idle: 300000,
        });

        let index = 0;
        collector.on('collect', async (messageInteraction) => {
            if (messageInteraction.isButton()) {
                if (messageInteraction.customId === 'backward') --index;
                else if (messageInteraction.customId === 'forward') ++index;

                messageInteraction.update({
                    components: [
                        new MessageActionRow({ components: [menu[index]] }),
                        new MessageActionRow({ components: [backwardButton.setDisabled(!backupChunks[index - 1]), forwardButton.setDisabled(!backupChunks[index + 1])] }),
                    ],
                });
            } else if (messageInteraction.isSelectMenu()) {
                const backup = backupChunks[index][+messageInteraction.values[0]];

                try {
                    const data = await readBackup(backup.name);
                    interaction.channel.send({ files: [new MessageAttachment(Buffer.from(data), backup.name)] });
                } catch (error) {
                    sendError(interaction.channel, error);
                }

                messageInteraction.update({ components: [new MessageActionRow({ components: [menu[index].setPlaceholder(backup.name).setDisabled(true)] })] });
                collector.stop('selected');
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'selected') selectionMessage.edit({ components: [new MessageActionRow({ components: [menu[index].setDisabled(true)] })] });
        });
    },
};
