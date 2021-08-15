import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { embedPages, sendError, sendInfo } from '../../lib/embeds.js';
import { formatTimeDate } from '../../lib/time.js';

export const command: Command = {
    commands: ['list'],
    superCommands: ['ticket'],
    help: 'List all of your tickets.',
    minArgs: 0,
    maxArgs: 0,
    cooldownDuration: 10000,
    channelWhitelist: [settings.botChannelID],
    callback: async (message) => {
        const { channel, member } = message;

        try {
            const tickets = await db.query(
                /*sql*/ `
                SELECT title, project_channel_id, channel_id, timestamp, closed FROM ticket WHERE author_id = $1 ORDER BY (NOT closed) DESC NULLS LAST, timestamp DESC;`,
                [member.id]
            );

            if (tickets.rowCount === 0) return sendError(channel, 'You do not have any tickets.');

            const content = tickets.rows.map(
                (ticket) =>
                    `**Title:** ${ticket.closed ? ticket.title : `<#${ticket.channel_id}>`}` +
                    `\n**Project:** ${ticket.project_channel_id ? `<#${ticket.project_channel_id}>` : 'DELETED PROJECT'}` +
                    `\n**Status:** ${ticket.closed ? 'closed' : 'open'}` +
                    `\n**Created At:** ${formatTimeDate(new Date(ticket.timestamp))}`
            );

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
