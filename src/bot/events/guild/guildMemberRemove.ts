import { Events } from 'discord.js';
import type { Event } from '../../eventHandler.ts';
import log from '../../lib/log.ts';
import { parseUser } from '../../lib/misc.ts';
import { Track } from '../../lib/punishment/track.ts';

export const event: Event = {
    name: Events.GuildMemberRemove,
    callback: async (member) => {
        const track = await Track.getByUserID(member.id).catch(() => undefined);
        if (!track) return;

        log(`${parseUser(member.user)} has left.\n\n${track.toString()}`, 'Track Leave');
    },
};
