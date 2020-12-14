import { GuildMember } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { checkMuteEvasion } from '../../lib/muteUser.js';

export const event: Event = {
    name: 'guildMemberAdd',
    callback: (member: GuildMember) => {
        checkMuteEvasion(member);
    },
};
