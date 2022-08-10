import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';
import { replyError } from '../../../lib/embeds.js';
import { editApsect } from '../shared.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');
        editApsect(interaction, id);
    },
};
