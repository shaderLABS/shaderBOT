import { Permissions } from 'discord.js';
import gq from 'graphql';
import tgq from 'type-graphql';
import { closeTicketLib, openTicketLib } from '../../bot/lib/tickets.js';
import { db } from '../postgres.js';
import { Ticket } from '../typedefinitions/Ticket.js';
import { fetchUser } from './UserResolver.js';

@tgq.Resolver(() => Ticket)
export class TicketResolver {
    @tgq.FieldResolver({ name: 'author', nullable: true })
    async author(@tgq.Root() ticket: Ticket) {
        return await fetchUser(ticket.author_id);
    }

    @tgq.FieldResolver({ name: 'project', nullable: true })
    async project(@tgq.Root() ticket: Ticket) {
        return (
            await db.query(
                /*sql*/ `
                SELECT channel_id::TEXT, owners::TEXT[]
                FROM project
                WHERE channel_id = $1
                LIMIT 1;`,
                [ticket.project_channel_id]
            )
        ).rows[0];
    }

    @tgq.FieldResolver({ name: 'comments' })
    async comments(@tgq.Root() ticket: Ticket) {
        return (
            await db.query(
                /*sql*/ `
                SELECT id::TEXT, message_id::TEXT, ticket_id::TEXT, author_id::TEXT, content, attachments, timestamp::TEXT, edited::TEXT
                FROM comment
                WHERE ticket_id = $1`,
                [ticket.id]
            )
        ).rows;
    }

    // @tgq.Mutation(() => Boolean)
    // createTicket(@tgq.Arg('title', () => String) title: string, @tgq.Arg('project', () => String) project: string, @tgq.Arg('description', () => String) description: string) {
    //     console.log(title, project, description);
    //     return true;
    // }

    @tgq.Query(() => [Ticket])
    async tickets() {
        return (
            await db.query(/*sql*/ `
                SELECT id, title, project_channel_id::TEXT, channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed 
                FROM ticket;`)
        ).rows;
    }

    @tgq.Query(() => Ticket, { nullable: true })
    async ticketByID(@tgq.Arg('id', () => String) id: string) {
        return (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id::TEXT, channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed 
                FROM ticket
                WHERE id = $1
                LIMIT 1;`,
                [id]
            )
        ).rows[0];
    }

    @tgq.Query(() => [Ticket])
    async ticketsByAuthorID(@tgq.Arg('author_id', () => String) id: string) {
        return (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id::TEXT, channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed 
                FROM ticket
                WHERE author_id = $1;`,
                [id]
            )
        ).rows;
    }

    @tgq.Query(() => [Ticket])
    async ticketsByProjectChannelID(@tgq.Arg('project_channel_id', () => String) id: string) {
        return (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id::TEXT, channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed 
                FROM ticket
                WHERE project_channel_id = $1;`,
                [id]
            )
        ).rows;
    }

    @tgq.Mutation(() => Ticket)
    async openTicket(@tgq.Arg('id', () => String) id: string, @tgq.Ctx() ctx: any) {
        if (!ctx.req.user || !ctx.req.user.permissions) return new gq.GraphQLError('Unauthorized');
        const permissions = new Permissions(ctx.req.user.permission);
        const bypassAuthor = permissions.has('MANAGE_CHANNELS');

        const ticket = await db.query(
            /*sql*/ `
            SELECT ticket.id, title, project_channel_id, description, author_id, edited, attachments, timestamp 
                FROM ticket 
                ${bypassAuthor ? '' : 'LEFT JOIN project ON ticket.project_channel_id = project.channel_id'}
                WHERE ticket.id = $1
                    AND closed = TRUE
                    ${bypassAuthor ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'} 
                LIMIT 1`,
            bypassAuthor ? [id] : [id, ctx.req.user.id]
        );

        if (ticket.rowCount === 0) return new gq.GraphQLError('Unauthorized or not found');

        try {
            return await openTicketLib(ticket.rows[0]);
        } catch {
            return new gq.GraphQLError('Failed to open ticket ' + id);
        }
    }

    @tgq.Mutation(() => Ticket)
    async closeTicket(@tgq.Arg('id', () => String) id: string, @tgq.Ctx() ctx: any) {
        if (!ctx.req.user || !ctx.req.user.permissions) return new gq.GraphQLError('Unauthorized');
        const permissions = new Permissions(ctx.req.user.permission);
        const bypassAuthor = permissions.has('MANAGE_CHANNELS');

        const response = await db.query(
            /*sql*/ `
            UPDATE ticket
            SET closed = TRUE 
            ${bypassAuthor ? '' : 'FROM ticket t LEFT JOIN project ON t.project_channel_id = project.channel_id'}
            WHERE ticket.id = $1 
                AND ticket.closed = FALSE 
                ${bypassAuthor ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'} 
            RETURNING ticket.subscription_message_id, ticket.channel_id, ticket.title, ticket.author_id, ticket.id, ticket.closed;`,
            bypassAuthor ? [id] : [id, ctx.req.user.id]
        );

        if (response.rowCount === 0) return new gq.GraphQLError('Unauthorized or not found');
        const ticket = response.rows[0];

        try {
            await closeTicketLib(ticket);
        } catch {
            return new gq.GraphQLError('Failed to close ticket ' + id);
        }

        return ticket;
    }
}
