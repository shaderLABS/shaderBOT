import { PermissionFlagsBits } from 'discord.js';
import automaticPunishment from '../../../lib/automaticPunishment.js';
import { replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { hasPermissionForTarget } from '../../../lib/searchMessage.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

const actionToString = ['They did not get punished.', 'They have been muted.', 'They have been temporarily banned.', 'They have been permanently banned.'];

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);
        if (!(await hasPermissionForTarget(interaction, targetUser))) return;

        const action = await automaticPunishment(targetUser);

        log(`${parseUser(interaction.user)} triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`, 'Trigger Punishment');
        replySuccess(interaction, `Successfully triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`, 'Trigger Punishment');
    },
};
