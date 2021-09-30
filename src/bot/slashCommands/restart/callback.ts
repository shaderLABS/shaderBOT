import { shutdown } from '../../../index.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replySuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        await replySuccess(interaction, 'The bot is being restarted...', 'Restart');
        await log(`The bot has been restarted by ${parseUser(interaction.user)}.`, 'Restart');
        shutdown();
    },
};
