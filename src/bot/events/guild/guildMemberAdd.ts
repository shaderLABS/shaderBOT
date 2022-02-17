import { GuildMember } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Event } from '../../eventHandler.js';

export const event: Event = {
    name: 'guildMemberAdd',
    callback: async (member: GuildMember) => {
        const mute = (
            await db.query(
                /*sql*/ `
                SELECT id
                FROM punishment
                WHERE "type" = 'mute' AND user_id = $1
                LIMIT 1`,
                [member.id]
            )
        ).rows[0];

        if (!mute && member.isCommunicationDisabled()) {
            member.timeout(null);
        }
    },
};
