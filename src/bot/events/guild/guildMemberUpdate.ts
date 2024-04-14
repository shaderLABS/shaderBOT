import { Events } from 'discord.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { Track } from '../../lib/punishment/track.js';

export const event: Event = {
    name: Events.GuildMemberUpdate,
    callback: async (oldMember, newMember) => {
        const changedNickname = oldMember.nickname !== newMember.nickname;
        if (!changedNickname) return;

        const track = await Track.getByUserID(newMember.id).catch(() => undefined);
        if (!track) return;

        log(
            `The nickname of ${parseUser(newMember.user)} has been updated.\n\n**Before**\n${oldMember.nickname ?? 'None'}\n\n**After**\n${newMember.nickname ?? 'None'}\n\n${track.toString()}`,
            'Track Nickname'
        );
    },
};
