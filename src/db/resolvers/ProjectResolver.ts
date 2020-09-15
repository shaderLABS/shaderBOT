import { GraphQLResolveInfo } from 'graphql';
import tgq from 'type-graphql';
import { client } from '../../bot/bot.js';
import { db } from '../postgres.js';
import { Project } from '../typedefinitions/Project.js';
import { fetchUser } from './UserResolver.js';

export function fetchChannel(id: string) {
    return client.guilds.cache.first()?.channels.cache.find((channel) => channel.id === id);
}

@tgq.Resolver(() => Project)
export class ProjectResolver {
    @tgq.FieldResolver({ name: 'channel', nullable: true })
    channel(@tgq.Root() project: Project) {
        return fetchChannel(project.channel_id);
    }

    @tgq.FieldResolver({ name: 'ownerUsers' })
    async ownerUsers(@tgq.Root() project: Project) {
        const results = [];
        for (const ownerID of project.owners) {
            results.push(await fetchUser(ownerID));
        }

        return results;
    }

    @tgq.Query(() => Project)
    async projectByChannelID(@tgq.Arg('id', () => String) id: string, @tgq.Info() info: GraphQLResolveInfo) {
        const project = (
            await db.query(
                /*sql*/ `
                SELECT channel_id::TEXT, owners::TEXT[]
                FROM project
                WHERE channel_id = $1`,
                [id]
            )
        ).rows[0];

        return project;
    }
}
