import JSONC from 'comment-json';
import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { settings } from '../../../bot.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: (interaction) => {
        const attachment = new AttachmentBuilder(Buffer.from(JSONC.stringify(settings.data, null, '\t')), { name: 'configuration.json' });
        interaction.reply({ files: [attachment] });
    },
};
