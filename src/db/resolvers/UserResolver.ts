import { GraphQLResolveInfo } from 'graphql';
import tgq from 'type-graphql';
import gpri from 'graphql-parse-resolve-info';
import { client } from '../../bot/bot.js';
import { User } from '../typedefinitions/User.js';
import { db } from '../postgres.js';

export function fetchUser(id: string) {
    return client.users.fetch(id);
}

@tgq.Resolver()
export class UserResolver {
    @tgq.Query(() => User)
    async user(@tgq.Arg('id', () => String) id: string, @tgq.Info() info: GraphQLResolveInfo) {
        const user: any = await fetchUser(id);

        const resolvedInfo = gpri.parseResolveInfo(info);
        if (resolvedInfo) {
            const selected = Object.keys(resolvedInfo.fieldsByTypeName.User);
            if (selected.includes('tickets')) {
                try {
                    user.tickets = (
                        await db.query(
                            /*sql*/ `
                            SELECT *
                            FROM ticket
                            WHERE author_id = $1`,
                            [id]
                        )
                    ).rows;
                } catch {}
            }

            if (selected.includes('projects')) {
                try {
                    user.projects = (
                        await db.query(
                            /*sql*/ `
                            SELECT *
                            FROM project
                            WHERE $1 = ANY (owners)`,
                            [id]
                        )
                    ).rows;
                } catch {}
            }
        }

        return user;
    }
}
