import { Message } from 'discord.js';
import { db } from '../../db/postgres.ts';
import { client } from '../bot.ts';
import type { GuildChatInputCommandInteraction } from '../chatInputCommandHandler.ts';
import { replyError } from './embeds.ts';
import log from './log.ts';
import { parseUser } from './misc.ts';

export type PunishmentTable = 'ban' | 'mute' | 'kick' | 'track' | 'lifted_ban' | 'lifted_mute' | 'note' | 'warn';

const PUNISHMENT_TABLE_TO_STRING: {
    [key in PunishmentTable]: string;
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

export async function editContextURL(id: string, contextURL: string, editModeratorID: string, table: PunishmentTable) {
    const editTimestamp = new Date();

    const result = await db.query({
        text: /*sql*/ `
            UPDATE ${table}
            SET context_url = $1, edited_timestamp = $2, edited_mod_id = $3
            FROM ${table} old_table
            WHERE ${table}.id = $4 AND old_table.id = ${table}.id
            RETURNING ${table}.user_id::TEXT, old_table.context_url AS old_context;`,
        values: [contextURL, editTimestamp, editModeratorID, id],
        name: `${table}-edit-context-url`,
    });
    if (result.rowCount === 0) return Promise.reject('There is no entry with the specified UUID.');

    const { user_id, old_context } = result.rows[0];

    const logString = `${parseUser(editModeratorID)} edited the context of ${parseUser(user_id)}'s ${PUNISHMENT_TABLE_TO_STRING[table]} (${id}).\n\n**Before**\n${
        old_context || 'No context exists.'
    }\n\n**After**\n${contextURL}`;

    log(logString, 'Edit Context');
    return logString;
}
