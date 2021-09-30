import { Message, MessageActionRow, MessageAttachment, MessageSelectMenu } from 'discord.js';
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

        const menu = new MessageSelectMenu({
            customId: 'select-backup',
            placeholder: backups.length + ' backups available...',
            options: backups.map((backup, index) => {
                return {
                    label: backup.name.substring(0, backup.name.lastIndexOf(' - ')),
                    value: index.toString(),
                    description: formatTimeDate(new Date(backup.createdAt)),
                };
            }),
        });

        await interaction.reply({ content: '**Select a Backup**', components: [new MessageActionRow({ components: [menu] })] });
        const selectionMessage = await interaction.fetchReply();
        if (!(selectionMessage instanceof Message)) return;

        const selection = await selectionMessage
            .awaitMessageComponent({
                componentType: 'SELECT_MENU',
                filter: (selectionInteraction) => selectionInteraction.user.id === interaction.user.id,
                time: 300000,
            })
            .catch(() => undefined);

        if (selection?.isSelectMenu()) {
            const backup = backups[+selection.values[0]];

            try {
                const data = await readBackup(backup.name);
                interaction.channel.send({ files: [new MessageAttachment(Buffer.from(data), backup.name)] });
            } catch (error) {
                sendError(interaction.channel, error);
            }

            selection.update({ components: [new MessageActionRow({ components: [menu.setPlaceholder(backup.name).setDisabled(true)] })] });
        } else {
            selectionMessage.edit({ components: [new MessageActionRow({ components: [menu.setDisabled(true)] })] });
        }
    },
};
