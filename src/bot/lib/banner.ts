import { GuildPremiumTier } from 'discord.js';
import { db } from '../../db/postgres.js';
import log from './log.js';
import { getGuild } from './misc.js';

export async function rotateBanner() {
    const guild = getGuild();
    if (!guild || guild.premiumTier === GuildPremiumTier.None || guild.premiumTier === GuildPremiumTier.Tier1) return;

    const projects = (
        await db.query({
            text: /*sql*/ `
            	SELECT id, banner_url, channel_id
            	FROM project
            	WHERE banner_url IS NOT NULL AND role_id IS NOT NULL
            	ORDER BY banner_last_timestamp ASC NULLS FIRST;`,
            name: 'project-rotate-banner-list',
        })
    ).rows;

    for (const project of projects) {
        try {
            await guild.setBanner(project.banner_url);
            await db.query({
                text: /*sql*/ `
                    UPDATE project
                    SET banner_last_timestamp = NOW()
                    WHERE id = $1;`,
                values: [project.id],
                name: 'project-rotate-banner-set',
            });

            break;
        } catch {
            log(`Failed to rotate banner to ${project.banner_url} by <#${project.channel_id}>. Skipping...`);
        }
    }
}
