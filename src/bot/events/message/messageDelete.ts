import { Event } from '../../eventHandler.js';
import { Message, TextChannel } from 'discord.js';
import { settings } from '../../bot.js';
import log from '../../lib/log.js';
import { db } from '../../../db/postgres.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if (
            !(channel instanceof TextChannel) || !channel.parentID || !settings.ticket.categoryIDs.includes(channel.parentID) || !channel.topic ||
            (!message.partial && (!message.author.bot || message.embeds.length === 0))
        ) return;

        const results = await db.query(
            /*sql*/ `
            DELETE FROM comment 
            WHERE channel_id = $1 AND message_id = $2
            RETURNING content`,
            [channel.id, message.id]
        );

        if (results.rowCount === 0) return;
        log(`Removed ticket comment from <#${channel.id}>:\n\n${results.rows[0].content}`);
    },
};
