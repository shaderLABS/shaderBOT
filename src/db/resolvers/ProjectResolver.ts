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

    @tgq.FieldResolver({ name: 'tickets', nullable: true })
    async tickets(@tgq.Root() project: Project) {
        return (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed
                FROM ticket
                WHERE project_channel_id = $1`,
                [project.channel_id]
            )
        ).rows;
    }

    @tgq.Query(() => Project)
    async projectByChannelID(@tgq.Arg('id', () => String) id: string) {
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
