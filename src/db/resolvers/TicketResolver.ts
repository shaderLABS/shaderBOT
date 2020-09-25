import tgq from 'type-graphql';
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
                SELECT id::TEXT, ticket_id::TEXT, author_id::TEXT, content, attachments, timestamp::TEXT, edited::TEXT
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
                SELECT id, title, project_channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed 
                FROM ticket;`)
        ).rows;
    }

    @tgq.Query(() => Ticket, { nullable: true })
    async ticketByID(@tgq.Arg('id', () => String) id: string) {
        return (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed 
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
                SELECT id, title, project_channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed 
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
                SELECT id, title, project_channel_id, description, attachments, author_id, timestamp::TEXT, edited, closed 
                FROM ticket
                WHERE project_channel_id = $1;`,
                [id]
            )
        ).rows;
    }
}
