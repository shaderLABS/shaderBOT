import { GuildPremiumTier, messageLink } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import log from './log.ts';
import { getGuild } from './misc.ts';
import { Project } from './project.ts';

export async function rotateBanner() {
    const guild = getGuild();
    if (guild.premiumTier === GuildPremiumTier.None || guild.premiumTier === GuildPremiumTier.Tier1) return;

    const projects = await db.query.project.findMany({
        columns: {
            id: true,
            bannerMessageId: true,
            channelId: true,
        },
        where: sql.and(sql.isNotNull(schema.project.bannerMessageId), sql.isNotNull(schema.project.roleId)),
        orderBy: sql.asc(schema.project.bannerLastTimestamp).append(sql.sql`NULLS FIRST`),
    });

    for (const project of projects) {
        try {
            const bannerURL = await Project.bannerMessageToCDNURL(project.channelId, project.bannerMessageId!);

            await guild.setBanner(bannerURL);

            await db
                .update(schema.project)
                .set({ bannerLastTimestamp: sql.sql`NOW()` })
                .where(sql.eq(schema.project.id, project.id));

            break;
        } catch (error) {
            console.error(error);
            const bannerMessageURL = messageLink(project.channelId, project.bannerMessageId!, guild.id);
            log(`Failed to rotate banner to [this image](${bannerMessageURL}) by <#${project.channelId}> (${project.id}). Skipping...`, 'Rotate Project Banner');
        }
    }
}
