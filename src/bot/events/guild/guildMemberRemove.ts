import { Events } from 'discord.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { Track } from '../../lib/punishment/track.js';

export const event: Event = {
    name: Events.GuildMemberRemove,
    callback: async (member) => {
        const track = await Track.getByUserID(member.id).catch(() => undefined);
        if (!track) return;

        log(`${parseUser(member.user)} has left.\n\n${track.toString()}`, 'Track Leave');
    },
};
