import { ChannelType, Events, LimitedCollection } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser, similarityLevenshtein } from '../../lib/misc.js';
import { ownerOverwrites } from '../../lib/project.js';
import { Punishment } from '../../lib/punishment.js';

type CachedMember = {
    username: string;
    avatarHash: string | null;
    createdTimestamp: number;
    banned: boolean;
};

const cache = new LimitedCollection<string, CachedMember>({ maxSize: settings.data.raidProtection.cacheLength });

export const event: Event = {
    name: Events.GuildMemberAdd,
    callback: async (member) => {
        /*******************
         * Raid Protection *
         *******************/

        const currentMember: CachedMember = {
            username: member.user.username,
            avatarHash: member.avatar,
            createdTimestamp: member.user.createdTimestamp,
            banned: false,
        };

        const potentialRaid = cache.filter(
            (previousMember) =>
                similarityLevenshtein(currentMember.username, previousMember.username) > settings.data.raidProtection.usernameSimilarityThreshold ||
                (currentMember.avatarHash && currentMember.avatarHash === previousMember.avatarHash) ||
                Math.abs(currentMember.createdTimestamp - previousMember.createdTimestamp) < settings.data.raidProtection.creationTimeThreshold * 1000
        );

        if (potentialRaid.size >= settings.data.raidProtection.userThreshold - 1) {
            potentialRaid.set(member.id, currentMember);

            for (const [raidMemberID, raidMember] of potentialRaid) {
                if (raidMember.banned) continue;

                raidMember.banned = true;
                Punishment.createBan(raidMemberID, 'Flagged by raid protection. If you are not a bot, please [submit a ban appeal](https://appeal.shaderlabs.org/) or contact the staff team.').catch(
                    () => undefined
                );
            }
        }

        // rotate cache
        cache.set(member.id, currentMember);

        /**********
         * Unmute *
         **********/

        const [mute, projects] = await Promise.all([
            Punishment.has(member.id, 'mute'),
            db.query(/*sql*/ `SELECT channel_id FROM project WHERE $1 = ANY (owners) AND role_id IS NOT NULL;`, [member.id]),
        ]);

        if (!mute && member.isCommunicationDisabled()) {
            member.timeout(null);
        }

        /******************
         * Project Owners *
         ******************/

        for (const project of projects.rows) {
            const channel = member.guild.channels.cache.get(project.channel_id);
            if (channel?.type !== ChannelType.GuildText) {
                log(`Failed to restore permissions for ${parseUser(member.user)}'s project channel <#${project.channel_id}>. The channel does not exist or is not cached.`, 'Restore Permissions');
                continue;
            }

            channel.permissionOverwrites.create(member, ownerOverwrites);
        }
    },
};
