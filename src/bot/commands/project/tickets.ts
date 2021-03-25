import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { embedPages, sendError, sendInfo } from '../../lib/embeds.js';
import { formatTimeDate } from '../../lib/time.js';

export const command: Command = {
    commands: ['tickets'],
    superCommands: ['project'],
    help: 'List all open tickets associated to this channel.',
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    cooldownDuration: 15000,
    callback: async (message) => {
        const { channel } = message;

        try {
            const tickets = await db.query(
                /*sql*/ `
                SELECT title, author_id, channel_id, timestamp FROM ticket WHERE closed = FALSE AND project_channel_id = $1 ORDER BY timestamp DESC;`,
                [channel.id]
            );

            if (tickets.rowCount === 0) return sendError(channel, 'There are no open tickets related to this channel.');

            const content = tickets.rows.map((ticket) => {
                return `**Title:** <#${ticket.channel_id}>
                **Author:** <@${ticket.author_id}>
                **Created At:** ${formatTimeDate(new Date(ticket.timestamp))}`;
            });

            const pages: string[] = [];

            content.reduce((prev, curr, i, arr) => {
                if ((i + 1) % 3 === 0 || i === arr.length - 1) {
                    pages.push(prev + '\n\n' + curr);
                    return '';
                }

                return prev + '\n\n' + curr;
            }, '');

            const firstPage = await sendInfo(channel, pages[0], 'Tickets');
            embedPages(firstPage, message.author, pages);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
