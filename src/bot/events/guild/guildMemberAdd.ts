import { Events, LimitedCollection } from 'discord.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser, similarityLevenshtein } from '../../lib/misc.js';
import { Project, ProjectMute } from '../../lib/project.js';
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

        /******************
         * Parallel Fetch *
         ******************/

        const [mute, projects, projectMutes] = await Promise.all([
            Punishment.getByUserID(member.id, 'mute').catch(() => undefined),
            Project.getAllUnarchivedByOwnerID(member.id),
            ProjectMute.getAllByUserID(member.id),
        ]);

        /**********
         * Unmute *
         **********/

        if (mute !== undefined) {
            // member is currently muted. re-set the timeout in case it was edited while they were gone.
            if (mute.expireTimestamp) member.disableCommunicationUntil(mute.expireTimestamp);
        } else if (member.isCommunicationDisabled()) {
            // member is not muted, but still has a timeout. remove the timeout.
            member.timeout(null);
        }

        /******************
         * Project Owners *
         ******************/

        for (const project of projects) {
            project.applyPermissions(member).catch((error) => {
                log(`Failed to restore permissions for ${parseUser(member.user)}'s project channel <#${project.channelID}> (${project.id}).\n${error}`, 'Restore Project Owner');
            });
        }

        /*****************
         * Project Mutes *
         *****************/

        for (const projectMute of projectMutes) {
            projectMute.applyPermissions();
        }
    },
};
