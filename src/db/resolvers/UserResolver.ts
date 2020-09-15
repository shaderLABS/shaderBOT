import tgq from 'type-graphql';
import { client } from '../../bot/bot.js';
import { User } from '../typedefinitions/User.js';
import { db } from '../postgres.js';

export function fetchUser(id: string) {
    return client.users.fetch(id);
}

@tgq.Resolver(() => User)
export class UserResolver {
    @tgq.FieldResolver({ name: 'tickets', nullable: true })
    async tickets(@tgq.Root() user: User) {
        return (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed
                FROM ticket
                WHERE author_id = $1`,
                [user.id]
            )
        ).rows;
    }

    @tgq.FieldResolver({ name: 'projects', nullable: true })
    async projects(@tgq.Root() user: User) {
        return (
            await db.query(
                /*sql*/ `
                SELECT channel_id::TEXT, owners::TEXT[]
                FROM project
                WHERE $1 = ANY (owners)`,
                [user.id]
            )
        ).rows;
    }

    @tgq.Query(() => User)
    async user(@tgq.Arg('id', () => String) id: string) {
        return await fetchUser(id);
    }
}
