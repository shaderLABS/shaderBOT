import { GuildPremiumTier, messageLink } from 'discord.js';
import { db } from '../../db/postgres.js';
import log from './log.js';
import { getGuild } from './misc.js';
import { Project } from './project.js';

export async function rotateBanner() {
    const guild = getGuild();
    if (guild.premiumTier === GuildPremiumTier.None || guild.premiumTier === GuildPremiumTier.Tier1) return;

    const rawProjects: {
        id: string;
        banner_message_id: string;
        channel_id: string;
    }[] = (
        await db.query({
            text: /*sql*/ `
            	SELECT id, banner_message_id, channel_id
            	FROM project
            	WHERE banner_message_id IS NOT NULL AND role_id IS NOT NULL
            	ORDER BY banner_last_timestamp ASC NULLS FIRST;`,
            name: 'project-rotate-banner-list',
        })
    ).rows;

    for (const rawProject of rawProjects) {
        try {
            const bannerURL = await Project.bannerMessageToCDNURL(rawProject.channel_id, rawProject.banner_message_id);

            await guild.setBanner(bannerURL);
            await db.query({
                text: /*sql*/ `
                    UPDATE project
                    SET banner_last_timestamp = NOW()
                    WHERE id = $1;`,
                values: [rawProject.id],
                name: 'project-rotate-banner-set',
            });

            break;
        } catch (error) {
            console.error(error);
            const bannerMessageURL = messageLink(rawProject.channel_id, rawProject.banner_message_id, guild.id);
            log(`Failed to rotate banner to [this image](${bannerMessageURL}) by <#${rawProject.channel_id}> (${rawProject.id}). Skipping...`, 'Rotate Project Banner');
        }
    }
}
