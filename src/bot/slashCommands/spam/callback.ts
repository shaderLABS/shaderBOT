import { PermissionFlagsBits } from 'discord.js';
import { getContextURL } from '../../lib/context.js';
import { replySuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { Punishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';
import { kickSpammer } from '../../lib/spamProtection.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        if (!(await hasPermissionForTarget(interaction, targetUser, 'bannable'))) return;

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        const logString = await kickSpammer(targetUser, interaction.user.id, contextURL);
        const mute = await Punishment.getByUserID(targetUser.id, 'mute').catch(() => undefined);
        mute?.move(interaction.user.id).catch(() => undefined);

        replySuccess(interaction, logString, 'Kick Spammer');
        log(logString, 'Kick Spammer');
    },
};
