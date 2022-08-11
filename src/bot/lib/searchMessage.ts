import { UserResolvable } from 'discord.js';
import { settings } from '../bot.js';
import { GuildChatInputCommandInteraction } from '../chatInputCommandHandler.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { replyError } from './embeds.js';
import log from './log.js';
import { parseUser, userToMember } from './misc.js';
import { Punishment } from './punishment.js';

export async function hasPermissionForTarget(interaction: GuildChatInputCommandInteraction, targetResolvable: UserResolvable, checkProperty?: 'bannable' | 'kickable' | 'manageable' | 'moderatable') {
    const targetMember = await userToMember(interaction.guild, targetResolvable);
    if (!targetMember) return true;

    if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
        replyError(interaction, 'The role of the targeted user is higher than or equal to yours.', 'Insufficient Permissions');
        return false;
    }

    if (checkProperty && targetMember[checkProperty] === false) {
        replyError(interaction, `The targeted user is not ${checkProperty}.`, 'Insufficient Permissions');
        return false;
    }

    return true;
}

export function matchBlacklist(message: GuildMessage) {
    if (settings.data.blacklist.strings.some((str) => message.content.includes(str))) {
        if (message.deletable) message.delete();
        Punishment.createMute(message.author, 'Sent message containing blacklisted content.', settings.data.blacklist.muteDuration).catch((e) =>
            log(`Failed to mute ${parseUser(message.author)} due to blacklisted content: ${e}`, 'Mute')
        );

        return true;
    }

    return false;
}
