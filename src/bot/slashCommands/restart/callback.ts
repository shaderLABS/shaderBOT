import { PermissionFlagsBits } from 'discord.js';
import { shutdown } from '../../../index.js';
import { replySuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        await replySuccess(interaction, 'The bot is being restarted...', 'Restart');
        await log(`The bot has been restarted by ${parseUser(interaction.user)}.`, 'Restart');
        shutdown();
    },
};
