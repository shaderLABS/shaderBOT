import { Event } from '../../eventHandler.js';
import { GuildMember } from 'discord.js';
import { checkMuteEvasion } from '../../lib/muteUser.js';

export const event: Event = {
    name: 'guildMemberAdd',
    callback: async (member: GuildMember) => {
        checkMuteEvasion(member);
    },
};
