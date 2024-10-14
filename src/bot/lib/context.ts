import { Message } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import { client } from '../bot.ts';
import type { GuildChatInputCommandInteraction } from '../chatInputCommandHandler.ts';
import { replyError } from './embeds.ts';
import log from './log.ts';
import { parseUser } from './misc.ts';

const PUNISHMENT_TABLE_LIST = [schema.ban, schema.mute, schema.kick, schema.track, schema.liftedBan, schema.liftedMute, schema.note, schema.warn] as const;

export type PunishmentTable = (typeof PUNISHMENT_TABLE_LIST)[number];
export type PunishmentTableOid = PunishmentTable['_']['name'];

export const PUNISHMENT_TABLEOID_TO_SCHEMA = PUNISHMENT_TABLE_LIST.reduce(
    (acc, table) => {
        acc[table._.name] = table;
        return acc;
    },
    {} as Record<PunishmentTableOid, PunishmentTable>,
);

const PUNISHMENT_TABLE_TO_STRING: {
    [key in PunishmentTableOid]: string;
} = {
    ban: 'ban',
    mute: 'mute',
    kick: 'kick',
    track: 'track',
    lifted_ban: 'lifted ban',
    lifted_mute: 'lifted mute',
    note: 'note',
    warn: 'warning',
};

export async function getContextURL(interaction: GuildChatInputCommandInteraction, targetID?: string): Promise<string | undefined> {
    const customURL = interaction.options.getString('context', false);

    if (customURL) {
        const IDs = customURL.split('/');
        const messageID = IDs.pop();
        const channelID = IDs.pop();

        if (!messageID || !channelID) {
            replyError(interaction, 'The specified message URL is invalid.');
            return;
        }

        const channel = client.channels.cache.get(channelID);
        if (!channel?.isTextBased()) {
            replyError(interaction, 'The specified message URL points to an invalid channel.');
            return;
        }

        const message = await channel.messages.fetch(messageID);
        if (!message) {
            replyError(interaction, 'The specified message URL points to an invalid message.');
            return;
        }

        return message.url;
    } else {
        let targetLastMessage: Message | undefined;

        // Prioritize the current channel's message cache.
        targetLastMessage = interaction.channel.messages.cache.filter((message) => message.author?.id === targetID).last();
        if (targetLastMessage) return targetLastMessage.url;

        // Fall back to the rest of the guild's message caches.
        for (const [_, channel] of interaction.guild.channels.cache) {
            if (!channel.isTextBased() || channel.messages.cache.size === 0) continue;

            const channelTargetLastMessage = channel.messages.cache.filter((message) => message.author?.id === targetID).last();
            if (!channelTargetLastMessage) continue;

            if (!targetLastMessage || channelTargetLastMessage.createdTimestamp > targetLastMessage.createdTimestamp) targetLastMessage = channelTargetLastMessage;
        }

        if (targetLastMessage) return targetLastMessage.url;

        // Fall back to fetching the last message from the current channel.
        const channelLastMessage = (await interaction.channel.messages.fetch({ limit: 1 })).first()?.url;
        if (channelLastMessage) return channelLastMessage;

        replyError(interaction, 'Failed to fetch a context URL. Please specify it manually using the `context` argument.');
        return;
    }
}

export async function editContextURL(id: string, contextUrl: string, editModeratorId: string, table: PunishmentTable) {
    const result = await db.select({ oldContextUrl: table.contextUrl, userId: table.userId }).from(table).where(sql.eq(table.id, id));

    if (result.length === 0) return Promise.reject('There is no entry with the specified UUID.');
    const { oldContextUrl, userId } = result[0];

    await db
        .update(table)
        .set({ contextUrl, editTimestamp: sql.sql`NOW()`, editModeratorId })
        .where(sql.eq(table.id, id));

    const logString = `${parseUser(editModeratorId)} edited the context of ${parseUser(userId)}'s ${PUNISHMENT_TABLE_TO_STRING[table._.name]} (${id}).\n\n**Before**\n${
        oldContextUrl || 'No context exists.'
    }\n\n**After**\n${contextUrl}`;

    log(logString, 'Edit Context');
    return logString;
}
