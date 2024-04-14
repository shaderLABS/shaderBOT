import { Events } from 'discord.js';
import { Event } from '../eventHandler.js';
import log from '../lib/log.js';
import { parseUser } from '../lib/misc.js';
import { Track } from '../lib/punishment/track.js';

export const event: Event = {
    name: Events.UserUpdate,
    callback: async (oldUser, newUser) => {
        const changedDisplayName = oldUser.displayName !== newUser.displayName;
        const changedGlobalName = oldUser.globalName !== newUser.globalName;
        const changedAvatar = oldUser.avatar !== newUser.avatar;

        if (!changedDisplayName && !changedGlobalName && !changedAvatar) return;

        const track = await Track.getByUserID(newUser.id).catch(() => undefined);
        if (!track) return;

        if (changedDisplayName) {
            log(`${parseUser(newUser)} has updated their display name.\n\n**Before**\n${oldUser.displayName}\n\n**After**\n${newUser.displayName}\n\n${track.toString()}`, 'Track Display Name');
        } else if (changedGlobalName) {
            log(
                `${parseUser(newUser)} has updated their global name.\n\n**Before**\n${oldUser.globalName ?? 'None'}\n\n**After**\n${newUser.globalName ?? 'None'}\n\n${track.toString()}`,
                'Track Global Name'
            );
        } else if (changedAvatar) {
            log(`${parseUser(newUser)} has updated their avatar.\n\n**Before**\nFirst attachment.\n\n**After**\nSecond attachment.\n\n${track.toString()}`, 'Track Avatar', [
                oldUser.displayAvatarURL(),
                newUser.displayAvatarURL(),
            ]);
        }
    },
};
