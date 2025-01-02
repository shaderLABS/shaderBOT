import type { UserResolvable } from 'discord.js';
import { settings } from '../bot.ts';
import type { GuildChatInputCommandInteraction } from '../chatInputCommandHandler.ts';
import type { GuildMessage } from '../events/message/messageCreate.ts';
import { replyError } from './embeds.ts';
import log from './log.ts';
import { parseUser, userToMember } from './misc.ts';
import { Mute } from './punishment/mute.ts';

export async function hasPermissionForTarget(interaction: GuildChatInputCommandInteraction, targetResolvable: UserResolvable, checkProperty?: 'bannable' | 'kickable' | 'manageable' | 'moderatable') {
    const targetMember = await userToMember(targetResolvable, interaction.guild);
    if (!targetMember) return true;

    if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
        replyError(interaction, {
            description: 'The role of the targeted user is higher than or equal to yours.',
            title: 'Insufficient Permissions',
        });
        return false;
    }

    if (checkProperty && targetMember[checkProperty] === false) {
        replyError(interaction, {
            description: `The targeted user is not ${checkProperty}.`,
            title: 'Insufficient Permissions',
        });
        return false;
    }

    return true;
}

export function matchBlacklist(message: GuildMessage) {
    if (settings.data.blacklist.strings.some((str) => message.content.includes(str))) {
        if (message.deletable) message.delete();
        Mute.create(message.author, 'Sent message containing blacklisted content.', settings.data.blacklist.muteDuration).catch((e) =>
            log(`Failed to mute ${parseUser(message.author)} due to blacklisted content: ${e}`, 'Mute'),
        );

        return true;
    }

    return false;
}
