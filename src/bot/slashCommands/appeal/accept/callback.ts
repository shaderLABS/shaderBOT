import { TextChannel } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { unban } from '../../../lib/banUser.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', false);

        try {
            const appeal = (
                await db.query(
                    /*sql*/ `
                    UPDATE appeal
                    SET result = 'accepted', result_reason = $1, result_mod_id = $2, result_timestamp = $3
                    WHERE user_id = $4 AND result = 'pending'
                    RETURNING message_id;`,
                    [reason, interaction.user.id, new Date(), targetUser.id]
                )
            ).rows[0];

            if (!appeal) return replyError(interaction, 'The specified user does not have a pending ban appeal.');

            await interaction.deferReply();

            const appealChannel = interaction.guild.channels.cache.get(settings.appealChannelID);
            if (appealChannel instanceof TextChannel) {
                const appealMessage = await appealChannel.messages.fetch(appeal.message_id).catch(() => undefined);
                if (appealMessage) {
                    appealMessage.thread?.setArchived(true).catch(() => undefined);
                    appealMessage.delete().catch(() => undefined);
                }
            }

            await unban(targetUser.id, interaction.user.id);

            replySuccess(interaction, `Successfully accepted ${parseUser(targetUser)}'s ban appeal.`, 'Accept Ban Appeal');
            log(`${parseUser(interaction.user)} accepted ${parseUser(targetUser)}'s ban appeal:\n\n${reason || 'No reason provided.'}`, 'Accept Ban Appeal');
        } catch (error) {
            replyError(interaction, error, undefined, false);
        }
    },
};
