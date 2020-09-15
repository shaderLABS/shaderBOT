import { GraphQLResolveInfo } from 'graphql';
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

    // @tgq.Mutation(() => Boolean)
    // createTicket(@tgq.Arg('title', () => String) title: string, @tgq.Arg('project', () => String) project: string, @tgq.Arg('description', () => String) description: string) {
    //     console.log(title, project, description);
    //     return true;
    // }

    @tgq.Query(() => [Ticket])
    async tickets(@tgq.Info() info: GraphQLResolveInfo) {
        const tickets = (
            await db.query(/*sql*/ `
                SELECT id, title, project_channel_id, description, attachments, author_id, timestamp::TEXT, edited, closed 
                FROM ticket;`)
        ).rows;

        return tickets;
    }

    @tgq.Query(() => [Ticket])
    async ticketsByAuthorID(@tgq.Arg('author_id', () => String) id: string, @tgq.Info() info: GraphQLResolveInfo) {
        const tickets = (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id, description, attachments, author_id, timestamp::TEXT, edited, closed 
                FROM ticket
                WHERE author_id = $1;`,
                [id]
            )
        ).rows;

        return tickets;
    }

    @tgq.Query(() => [Ticket])
    async ticketsByProjectChannelID(@tgq.Arg('project_channel_id', () => String) id: string, @tgq.Info() info: GraphQLResolveInfo) {
        const tickets = (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id, description, attachments, author_id, timestamp::TEXT, edited, closed 
                FROM ticket
                WHERE project_channel_id = $1;`,
                [id]
            )
        ).rows;

        return tickets;
    }
}
