import { db } from '../../db/postgres.js';
import { GuildChatInputCommandInteraction } from '../chatInputCommandHandler.js';
import { replyError } from './embeds.js';
import log from './log.js';
import { parseUser } from './misc.js';

const tableToString = {
    warn: 'warning',
    punishment: 'punishment',
    past_punishment: 'past punishment',
    note: 'note',
};

export async function getContextURL(interaction: GuildChatInputCommandInteraction, targetID?: string) {
    const customURL = interaction.options.getString('context', false);

    if (customURL) {
        const IDs = customURL.split('/');
        const messageID = IDs.pop();
        const channelID = IDs.pop();

        if (!messageID || !channelID) {
            replyError(interaction, 'The specified message URL is invalid.');
            return;
        }

        const channel = interaction.guild.channels.cache.get(channelID);
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
        const targetLastMessage = interaction.channel.messages.cache.filter((message) => message.author?.id === targetID).last()?.url;
        if (targetLastMessage) return targetLastMessage;

        const channelLastMessage = (await interaction.channel.messages.fetch({ limit: 1 })).first()?.url;
        if (channelLastMessage) return channelLastMessage;

        replyError(interaction, 'Failed to fetch a context URL. Please specify it manually using the `context` argument.');
    }
}

export async function editContextURL(id: string, contextURL: string, editModeratorID: string, table: 'warn' | 'punishment' | 'past_punishment' | 'note') {
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

    const logString = `${parseUser(editModeratorID)} edited the context of ${parseUser(user_id)}'s ${tableToString[table]} (${id}).\n\n**Before**\n${
        old_context || 'No context exists.'
    }\n\n**After**\n${contextURL}`;

    log(logString, 'Edit Context');
    return logString;
}
